import os
import time
from flask import jsonify, request

_buckets = {}
_HEAVY_PATHS = (
    "/chatbot/ask",
    "/voice/stt",
    "/voice/tts",
    "/plant-disease",
    "/translate",
)


def _key():
    auth = (request.headers.get("Authorization") or "")[:40]
    return f"{request.remote_addr}:{auth}:{request.path}"


def check_rate_limit():
    now = time.time()
    window = 60.0
    max_hits = 20 if request.path in _HEAVY_PATHS else 60
    key = _key()
    start, count = _buckets.get(key, (now, 0))
    if now - start > window:
        _buckets[key] = (now, 1)
        return None
    count += 1
    _buckets[key] = (start, count)
    if count > max_hits:
        return jsonify({"error": "Too many requests. Please wait and try again."}), 429
    return None


def public_error(message="Something went wrong. Please try again."):
    return jsonify({"error": message}), 500


def cors_origins():
    raw = os.getenv("CORS_ORIGINS", "")
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    if origins:
        return origins
    if os.getenv("FLASK_ENV") == "production" or os.getenv("NODE_ENV") == "production":
        return []
    return "*"
