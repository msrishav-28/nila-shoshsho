import os
from flask import Blueprint, jsonify, request
import requests

news_bp = Blueprint("news", __name__)

SERP_URL = "https://serpapi.com/search"
REQUEST_TIMEOUT_SECONDS = 20
MAX_SEARCH_LEN = 120

ALLOWED_CATEGORIES = frozenset(
    {"all", "crops", "weather", "market", "technology", "government"}
)
ALLOWED_STATES = frozenset(
    {
        "all",
        "andhra pradesh",
        "punjab",
        "haryana",
        "maharashtra",
        "karnataka",
        "madhya pradesh",
        "gujarat",
        "rajasthan",
        "uttar pradesh",
        "tamil nadu",
        "west bengal",
        "bihar",
        "telangana",
    }
)
LANG_TO_HL = {
    "english": "en",
    "hindi": "hi",
    "marathi": "mr",
    "tamil": "ta",
    "bengali": "bn",
    "kannada": "kn",
    "telugu": "te",
    "malayalam": "ml",
    "en": "en",
    "hi": "hi",
    "mr": "mr",
    "ta": "ta",
    "bn": "bn",
    "kn": "kn",
    "te": "te",
    "ml": "ml",
}


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
    state = (request.args.get("state") or "all").strip().lower()
    search = (request.args.get("search") or "").strip()
    lang = (request.args.get("lang") or "english").strip().lower()

    if category not in ALLOWED_CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400
    if state not in ALLOWED_STATES:
        return jsonify({"error": "Invalid state"}), 400
    if len(search) > MAX_SEARCH_LEN:
        return jsonify({"error": "Search is too long"}), 400

    hl = LANG_TO_HL.get(lang, "en")
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
