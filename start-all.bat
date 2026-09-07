@echo off
echo Starting CrimeLink Portal - all services...

start "Frontend" cmd /k "cd frontend && npm run dev"

start "Backend - Auth/Cases" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload"

start "Reports Backend" cmd /k "cd reports-backend && venv\Scripts\activate && python app.py"

start "AI Backend" cmd /k "cd ai-backend && venv\Scripts\activate && python app.py"

start "Graph Backend" cmd /k "cd graph-backend && venv\Scripts\activate && python app.py"

echo All services starting in separate windows...