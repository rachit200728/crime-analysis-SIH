"""
Criminal Case File Analysis System — FastAPI backend

Features:
- JWT auth with two roles: "analyst" and "supervisor". The first registered
  user bootstraps as a supervisor; supervisors create all subsequent accounts.
  Analysts can create/view cases, upload evidence, run analysis, add notes.
  Supervisors can additionally close/archive cases, reassign investigators,
  and delete cases/evidence. Build two frontends against the same API and
  route the UI (which buttons/pages show) off the role in /users/me or the
  JWT's "role" claim — the backend enforces the same rules regardless of
  which frontend calls it.
- Case CRUD (create/read/update/delete criminal case records)
- Evidence file upload per case (PDF/TXT/DOCX supported for text extraction)
- Basic text analysis: keyword frequency, flagged-term detection, simple
  named-entity style extraction (names, dates, monetary amounts) via regex
- SQLite storage (via SQLAlchemy) — swap the DB_URL for Postgres/MySQL in prod
- Search across cases and evidence text

Run:
    pip install fastapi uvicorn sqlalchemy python-multipart pypdf python-docx \
        python-jose[cryptography] passlib[bcrypt] --break-system-packages
    uvicorn main:app --reload

Docs:
    http://127.0.0.1:8000/docs
"""

import os
import re
import shutil
import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    or_,
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

# --------------------------------------------------------------------------
# Database setup
# --------------------------------------------------------------------------

DB_URL = "sqlite:///./case_analysis.db"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

UPLOAD_DIR = "evidence_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --------------------------------------------------------------------------
# Auth config — CHANGE SECRET_KEY and load it from an environment variable
# in production. Never commit a real secret to source control.
# --------------------------------------------------------------------------

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-this-secret-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8-hour shift-length token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class Base(DeclarativeBase):
    pass


class UserRole(str, Enum):
    analyst = "analyst"
    supervisor = "supervisor"


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, default="")
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.analyst.value)
    created_at = Column(DateTime, default=datetime.utcnow)


class CaseStatus(str, Enum):
    open = "open"
    under_review = "under_review"
    closed = "closed"
    archived = "archived"


class CasePriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class CaseModel(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    status = Column(String, default=CaseStatus.open.value)
    priority = Column(String, default=CasePriority.medium.value)
    assigned_investigator = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    evidence_items = relationship(
        "EvidenceModel", back_populates="case", cascade="all, delete-orphan"
    )
    notes = relationship(
        "NoteModel", back_populates="case", cascade="all, delete-orphan"
    )


class EvidenceModel(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    content_type = Column(String, default="")
    extracted_text = Column(Text, default="")
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("CaseModel", back_populates="evidence_items")


class NoteModel(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    author = Column(String, default="")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("CaseModel", back_populates="notes")


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------------------------------
# Pydantic schemas
# --------------------------------------------------------------------------


class CaseCreate(BaseModel):
    case_number: str = Field(..., examples=["CR-2026-00142"])
    title: str
    description: str = ""
    status: CaseStatus = CaseStatus.open
    priority: CasePriority = CasePriority.medium
    assigned_investigator: str = ""


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    priority: Optional[CasePriority] = None
    assigned_investigator: Optional[str] = None


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_number: str
    title: str
    description: str
    status: str
    priority: str
    assigned_investigator: str
    created_at: datetime
    updated_at: datetime


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_id: int
    filename: str
    content_type: str
    uploaded_at: datetime


class NoteCreate(BaseModel):
    author: str = ""
    content: str


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_id: int
    author: str
    content: str
    created_at: datetime


class AnalysisResult(BaseModel):
    evidence_id: int
    filename: str
    word_count: int
    top_keywords: List[dict]
    flagged_terms: List[str]
    dates_found: List[str]
    monetary_amounts: List[str]
    possible_names: List[str]


# --------------------------------------------------------------------------
# Text extraction helpers
# --------------------------------------------------------------------------


def extract_text_from_file(path: str, content_type: str) -> str:
    """Extract plain text from uploaded evidence files."""
    try:
        if content_type == "application/pdf" or path.lower().endswith(".pdf"):
            from pypdf import PdfReader

            reader = PdfReader(path)
            return "\n".join(page.extract_text() or "" for page in reader.pages)

        if path.lower().endswith(".docx"):
            import docx

            doc = docx.Document(path)
            return "\n".join(p.text for p in doc.paragraphs)

        # Fall back to treating it as plain text
        with open(path, "r", errors="ignore") as f:
            return f.read()
    except Exception:
        return ""


# --------------------------------------------------------------------------
# Analysis helpers
# --------------------------------------------------------------------------

# Words worth flagging in a criminal-case context. Customize freely.
DEFAULT_FLAGGED_TERMS = [
    "weapon", "firearm", "threat", "alibi", "witness", "suspect",
    "confession", "warrant", "narcotics", "assault", "homicide",
    "fraud", "conspiracy", "evidence tampering",
]

STOPWORDS = set(
    "the a an of to and in on for is was were with that this as by at be "
    "or from it he she they his her their them not are but if into then".split()
)

DATE_RE = re.compile(
    r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|"
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
    r"Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b",
    re.IGNORECASE,
)
MONEY_RE = re.compile(r"\$\s?[\d,]+(?:\.\d{2})?")
# Rough heuristic for proper names: two consecutive capitalized words
NAME_RE = re.compile(r"\b[A-Z][a-z]+\s[A-Z][a-z]+\b")


def analyze_text(text: str, flagged_terms: Optional[List[str]] = None) -> dict:
    flagged_terms = flagged_terms or DEFAULT_FLAGGED_TERMS
    words = re.findall(r"[A-Za-z']+", text.lower())
    word_count = len(words)

    freq = {}
    for w in words:
        if w in STOPWORDS or len(w) < 3:
            continue
        freq[w] = freq.get(w, 0) + 1
    top_keywords = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:15]
    top_keywords = [{"term": k, "count": v} for k, v in top_keywords]

    lowered = text.lower()
    flagged_found = sorted({t for t in flagged_terms if t.lower() in lowered})

    dates_found = sorted(set(DATE_RE.findall(text))) if text else []
    money_found = sorted(set(MONEY_RE.findall(text))) if text else []
    names_found = sorted(set(NAME_RE.findall(text)))[:25] if text else []

    return {
        "word_count": word_count,
        "top_keywords": top_keywords,
        "flagged_terms": flagged_found,
        "dates_found": dates_found,
        "monetary_amounts": money_found,
        "possible_names": names_found,
    }


# --------------------------------------------------------------------------
# Auth schemas
# --------------------------------------------------------------------------


class UserCreate(BaseModel):
    username: str
    full_name: str = ""
    password: str
    role: UserRole = UserRole.analyst


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str
    role: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


# --------------------------------------------------------------------------
# Auth helpers
# --------------------------------------------------------------------------


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> UserModel:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_error
    except JWTError:
        raise credentials_error

    user = db.query(UserModel).filter(UserModel.username == username).first()
    if user is None:
        raise credentials_error
    return user


def require_supervisor(user: UserModel = Depends(get_current_user)) -> UserModel:
    """Dependency that only lets supervisors through. Use on
    supervisor-only endpoints (closing/archiving cases, deletions,
    reassigning investigators, user management)."""
    if user.role != UserRole.supervisor.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires supervisor privileges",
        )
    return user


# --------------------------------------------------------------------------
# FastAPI app
# --------------------------------------------------------------------------

app = FastAPI(
    title="Criminal Case File Analysis System",
    description="API for managing criminal case records, evidence files, and text analysis.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------- Auth endpoints ----------------------


@app.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED, tags=["Auth"])
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    # First account in an empty system may self-register as supervisor to
    # bootstrap; after that, only an existing supervisor can create accounts.
    # Swap this out for your own admin/invite flow before going to production.
):
    existing = db.query(UserModel).filter(UserModel.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")

    any_users = db.query(UserModel).first()
    if any_users is not None:
        raise HTTPException(
            status_code=403,
            detail="Self-registration is closed. Ask a supervisor to create your account via /users.",
        )

    user = UserModel(
        username=payload.username,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=UserRole.supervisor.value,  # first user bootstraps as supervisor
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED, tags=["Auth"])
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_supervisor),
):
    """Supervisors create analyst or supervisor accounts."""
    existing = db.query(UserModel).filter(UserModel.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")
    user = UserModel(
        username=payload.username,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=Token, tags=["Auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user.username, "role": user.role})
    return Token(access_token=token, role=user.role)


@app.get("/users/me", response_model=UserOut, tags=["Auth"])
def read_current_user(current_user: UserModel = Depends(get_current_user)):
    return current_user


# ---------------------- Case endpoints ----------------------


@app.post("/cases", response_model=CaseOut, status_code=status.HTTP_201_CREATED, tags=["Cases"])
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),  # any logged-in analyst/supervisor
):
    existing = db.query(CaseModel).filter(CaseModel.case_number == payload.case_number).first()
    if existing:
        raise HTTPException(status_code=409, detail="Case number already exists")
    case = CaseModel(
        case_number=payload.case_number,
        title=payload.title,
        description=payload.description,
        status=payload.status.value,
        priority=payload.priority.value,
        assigned_investigator=payload.assigned_investigator,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@app.get("/cases", response_model=List[CaseOut], tags=["Cases"])
def list_cases(
    status_filter: Optional[CaseStatus] = Query(None, alias="status"),
    priority: Optional[CasePriority] = None,
    investigator: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    q = db.query(CaseModel)
    if status_filter:
        q = q.filter(CaseModel.status == status_filter.value)
    if priority:
        q = q.filter(CaseModel.priority == priority.value)
    if investigator:
        q = q.filter(CaseModel.assigned_investigator.ilike(f"%{investigator}%"))
    return q.order_by(CaseModel.created_at.desc()).all()


@app.get("/cases/{case_id}", response_model=CaseOut, tags=["Cases"])
def get_case(
    case_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)
):
    case = db.query(CaseModel).filter(CaseModel.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@app.patch("/cases/{case_id}", response_model=CaseOut, tags=["Cases"])
def update_case(
    case_id: int,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    case = db.query(CaseModel).filter(CaseModel.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    data = payload.model_dump(exclude_unset=True)

    # Supervisor-only fields/transitions
    is_supervisor = current_user.role == UserRole.supervisor.value
    if "assigned_investigator" in data and not is_supervisor:
        raise HTTPException(status_code=403, detail="Only supervisors can reassign investigators")
    if "status" in data and data["status"] in (CaseStatus.closed, CaseStatus.archived) and not is_supervisor:
        raise HTTPException(status_code=403, detail="Only supervisors can close or archive a case")

    for field, value in data.items():
        setattr(case, field, value.value if isinstance(value, Enum) else value)
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    return case


@app.delete("/cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Cases"])
def delete_case(
    case_id: int, db: Session = Depends(get_db), _: UserModel = Depends(require_supervisor)
):
    case = db.query(CaseModel).filter(CaseModel.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(case)
    db.commit()
    return None


# ---------------------- Evidence endpoints ----------------------


@app.post("/cases/{case_id}/evidence", response_model=EvidenceOut, tags=["Evidence"])
def upload_evidence(
    case_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    case = db.query(CaseModel).filter(CaseModel.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    ext = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)

    with open(stored_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = extract_text_from_file(stored_path, file.content_type or "")

    evidence = EvidenceModel(
        case_id=case_id,
        filename=file.filename,
        stored_path=stored_path,
        content_type=file.content_type or "",
        extracted_text=extracted_text,
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence


@app.get("/cases/{case_id}/evidence", response_model=List[EvidenceOut], tags=["Evidence"])
def list_evidence(
    case_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)
):
    return db.query(EvidenceModel).filter(EvidenceModel.case_id == case_id).all()


@app.get("/evidence/{evidence_id}/text", tags=["Evidence"])
def get_evidence_text(
    evidence_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)
):
    ev = db.query(EvidenceModel).filter(EvidenceModel.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return {"evidence_id": ev.id, "filename": ev.filename, "text": ev.extracted_text}


@app.delete("/evidence/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Evidence"])
def delete_evidence(
    evidence_id: int, db: Session = Depends(get_db), _: UserModel = Depends(require_supervisor)
):
    ev = db.query(EvidenceModel).filter(EvidenceModel.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    if os.path.exists(ev.stored_path):
        os.remove(ev.stored_path)
    db.delete(ev)
    db.commit()
    return None


# ---------------------- Analysis endpoints ----------------------


@app.get("/evidence/{evidence_id}/analyze", response_model=AnalysisResult, tags=["Analysis"])
def analyze_evidence(
    evidence_id: int,
    flagged_terms: Optional[str] = Query(
        None, description="Comma-separated custom flagged terms, overrides defaults"
    ),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    ev = db.query(EvidenceModel).filter(EvidenceModel.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")

    terms = [t.strip() for t in flagged_terms.split(",")] if flagged_terms else None
    result = analyze_text(ev.extracted_text, terms)
    return AnalysisResult(evidence_id=ev.id, filename=ev.filename, **result)


@app.get("/cases/{case_id}/analyze", tags=["Analysis"])
def analyze_case(
    case_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)
):
    """Aggregate analysis across all evidence attached to a case."""
    case = db.query(CaseModel).filter(CaseModel.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    combined_text = "\n".join(ev.extracted_text for ev in case.evidence_items)
    result = analyze_text(combined_text)
    return {
        "case_id": case.id,
        "case_number": case.case_number,
        "evidence_count": len(case.evidence_items),
        **result,
    }


# ---------------------- Notes endpoints ----------------------


@app.post("/cases/{case_id}/notes", response_model=NoteOut, tags=["Notes"])
def add_note(
    case_id: int,
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    case = db.query(CaseModel).filter(CaseModel.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    note = NoteModel(
        case_id=case_id, author=payload.author or current_user.username, content=payload.content
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@app.get("/cases/{case_id}/notes", response_model=List[NoteOut], tags=["Notes"])
def list_notes(
    case_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)
):
    return db.query(NoteModel).filter(NoteModel.case_id == case_id).all()


# ---------------------- Search ----------------------


@app.get("/search", tags=["Search"])
def search(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    cases = (
        db.query(CaseModel)
        .filter(
            or_(
                CaseModel.title.ilike(f"%{q}%"),
                CaseModel.description.ilike(f"%{q}%"),
                CaseModel.case_number.ilike(f"%{q}%"),
            )
        )
        .all()
    )
    evidence = db.query(EvidenceModel).filter(EvidenceModel.extracted_text.ilike(f"%{q}%")).all()
    return {
        "cases": [CaseOut.model_validate(c) for c in cases],
        "evidence": [
            {"id": e.id, "case_id": e.case_id, "filename": e.filename} for e in evidence
        ],
    }


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "Criminal Case File Analysis System"}
