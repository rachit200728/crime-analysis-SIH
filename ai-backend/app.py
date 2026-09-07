from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
import json
import os

app = Flask(__name__)
CORS(app)

nlp = spacy.load("en_core_web_sm")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORE_FILE = os.path.join(BASE_DIR, "case_entities.json")
TIMELINE_FILE = os.path.join(BASE_DIR, "case_timeline.json")

import requests
import time

GEOCODE_CACHE_FILE = os.path.join(BASE_DIR, "geocode_cache.json")
_last_geocode_call = [0]


def geocode_location(place_name):
    """Look up real-world coordinates for any place name using OpenStreetMap Nominatim.
    Results are cached locally so we never look up the same place twice."""
    cache = read_json_file(GEOCODE_CACHE_FILE)
    key = place_name.lower().strip()

    if key in cache:
        return cache[key]

    # Respect Nominatim's 1 request/second usage policy
    elapsed = time.time() - _last_geocode_call[0]
    if elapsed < 1.1:
        time.sleep(1.1 - elapsed)

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": place_name,
                "format": "json",
                "limit": 1,
                "accept-language": "en",
            },
            headers={"User-Agent": "CrimeLink-Investigation-Platform/1.0"},
            timeout=5,
        )
        _last_geocode_call[0] = time.time()
        results = response.json()

        if results:
            result = results[0]
            display_name = result.get("display_name", place_name).split(",")[0]
            coords = {
                "lat": float(result["lat"]),
                "lng": float(result["lon"]),
                "display_name": display_name,
            }
            cache[key] = coords
            write_json_file(GEOCODE_CACHE_FILE, cache)
            return coords
    except Exception:
        pass

    cache[key] = None
    write_json_file(GEOCODE_CACHE_FILE, cache)
    return None

LABEL_MAP = {
    "PERSON": "person",
    "GPE": "location",
    "LOC": "location",
    "ORG": "organization",
    "DATE": "date",
    "MONEY": "money",
    "CARDINAL": "number",
}


def read_json_file(path):
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}


def write_json_file(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def extract_from_text(doc):
    entities = {"person": [], "location": [], "organization": [], "date": [], "money": [], "number": []}

    for ent in doc.ents:
        category = LABEL_MAP.get(ent.label_)
        if category and ent.text not in entities[category]:
            entities[category].append(ent.text)

    return entities


def extract_timeline_events(doc):
    events = []
    for sent in doc.sents:
        dates_in_sentence = [ent.text for ent in sent.ents if ent.label_ == "DATE"]
        if dates_in_sentence:
            events.append({
                "date": dates_in_sentence[0],
                "context": sent.text.strip(),
            })
    return events


@app.route("/api/extract", methods=["POST"])
def extract_entities():
    data = request.get_json()
    text = (data.get("text") or "").strip()
    case_id = data.get("case_id")

    if not text:
        return jsonify({"error": "No text provided."}), 400

    doc = nlp(text)
    entities = extract_from_text(doc)
    events = extract_timeline_events(doc)

    # Filter out anything mistakenly tagged as both a person and a location
    location_lower = {l.lower() for l in entities["location"]}
    org_lower = {o.lower() for o in entities["organization"]}
    entities["person"] = [
        p for p in entities["person"]
        if p.lower() not in location_lower and p.lower() not in org_lower
    ]

    if case_id:
        store = read_json_file(STORE_FILE)
        existing = store.get(case_id, {"person": [], "location": [], "organization": [], "date": [], "money": [], "number": []})

        for key in entities:
            for item in entities[key]:
                if item not in existing[key]:
                    existing[key].append(item)

        store[case_id] = existing
        write_json_file(STORE_FILE, store)

        if events:
            timeline_store = read_json_file(TIMELINE_FILE)
            existing_events = timeline_store.get(case_id, [])

            for ev in events:
                if ev not in existing_events:
                    existing_events.append(ev)

            timeline_store[case_id] = existing_events
            write_json_file(TIMELINE_FILE, timeline_store)

    return jsonify({
        "text_length": len(text),
        "entities": entities,
        "total_found": sum(len(v) for v in entities.values()),
        "events_found": len(events),
    })


@app.route("/api/linked-cases/<case_id>", methods=["GET"])
def linked_cases(case_id):
    store = read_json_file(STORE_FILE)
    current = store.get(case_id)

    if not current:
        return jsonify({"case_id": case_id, "matches": []})

    matches = []

    for other_id, other_entities in store.items():
        if other_id == case_id:
            continue

        for category in ["person", "location", "organization"]:
            for item in current.get(category, []):
                if item in other_entities.get(category, []):
                    matches.append({
                        "linked_case": other_id,
                        "shared_entity": item,
                        "type": category,
                    })

    return jsonify({"case_id": case_id, "matches": matches})


@app.route("/api/timeline/<case_id>", methods=["GET"])
def get_timeline(case_id):
    timeline_store = read_json_file(TIMELINE_FILE)
    events = timeline_store.get(case_id, [])
    return jsonify({"case_id": case_id, "events": events})


@app.route("/api/all-entities", methods=["GET"])
def all_entities():
    store = read_json_file(STORE_FILE)
    return jsonify(store)


@app.route("/api/locations", methods=["GET"])
def get_locations():
    store = read_json_file(STORE_FILE)
    location_map = {}

    for case_id, ents in store.items():
        for loc in ents.get("location", []):
            coords = geocode_location(loc)
            if not coords:
                continue

            key = loc.lower().strip()
            if key not in location_map:
                location_map[key] = {
                    "name": coords.get("display_name", loc),
                    "lat": coords["lat"],
                    "lng": coords["lng"],
                    "cases": [],
                }
            if case_id not in location_map[key]["cases"]:
                location_map[key]["cases"].append(case_id)

    return jsonify(list(location_map.values()))


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "AI service running"})


if __name__ == "__main__":
    app.run(port=5001, debug=True)