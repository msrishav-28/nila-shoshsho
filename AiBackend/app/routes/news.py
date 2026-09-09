import os
from flask import Blueprint, jsonify, request
import requests
from app.news_filters import is_allowed_state, news_hl, normalize_state

news_bp = Blueprint("news", __name__)

SERP_URL = "https://serpapi.com/search"
REQUEST_TIMEOUT_SECONDS = 20
MAX_SEARCH_LEN = 120

ALLOWED_CATEGORIES = frozenset(
    {"all", "crops", "weather", "market", "technology", "government"}
)


def _build_query(category, state, search):
    parts = ["latest agriculture news india farmers"]
    if category != "all":
        parts.append(category)
    if state != "all":
        parts.append(state)
    if search:
        parts.append(search)
    return " ".join(parts)


@news_bp.route("/news", methods=["GET"])
def get_news():
    api_key = os.getenv("SERP_API_KEY")
    if not api_key:
        return jsonify({"error": "News service is not configured"}), 503

    category = (request.args.get("category") or "all").strip().lower()
    state = normalize_state(request.args.get("state"))
    search = (request.args.get("search") or "").strip()
    lang = (request.args.get("lang") or "en").strip()

    if category not in ALLOWED_CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400
    if not is_allowed_state(state):
        return jsonify({"error": "Invalid state"}), 400
    if len(search) > MAX_SEARCH_LEN:
        return jsonify({"error": "Search is too long"}), 400

    hl = news_hl(lang)
    query = _build_query(category, state, search)

    try:
        response = requests.get(
            SERP_URL,
            params={
                "api_key": api_key,
                "engine": "google_news",
                "q": query,
                "tbm": "nws",
                "num": 20,
                "gl": "in",
                "hl": hl,
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException:
        return jsonify({"error": "News service is unavailable"}), 502

    if response.status_code != 200:
        return jsonify({"error": "News service is unavailable"}), 502

    payload = response.json()
    results = payload.get("news_results")
    if not isinstance(results, list):
        return jsonify({"news_results": []}), 200

    return jsonify({"news_results": results}), 200
