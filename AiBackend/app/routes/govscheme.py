# govscheme_bp.py

from flask import Blueprint, request, jsonify
import requests
import os

govscheme_bp = Blueprint('govscheme', __name__)
MYSCHEME_SEARCH = "https://api.myscheme.gov.in/search/v4/schemes"


@govscheme_bp.route('/govscheme', methods=['POST'])
def get_gov_scheme_info():
    data = request.get_json(silent=True) or {}
    user_query = (data.get("query") or "").strip()
    if not user_query:
        return jsonify({"error": "Query not provided"}), 400

    api_key = os.getenv("MYSCHEME_API_KEY")
    if not api_key:
        return jsonify(
            {
                "error": "Scheme catalogue is not configured",
                "link": "https://www.myscheme.gov.in",
                "source": "myScheme.gov.in",
            }
        ), 503

    try:
        response = requests.get(
            MYSCHEME_SEARCH,
            params={"lang": "en", "q": user_query[:120]},
            headers={"x-api-key": api_key},
            timeout=20,
        )
    except requests.RequestException:
        return jsonify({"error": "Scheme catalogue is unavailable"}), 502

    if response.status_code in (401, 403):
        return jsonify(
            {
                "error": "Scheme catalogue key was refused",
                "link": "https://www.myscheme.gov.in",
            }
        ), 503
    if response.status_code != 200:
        return jsonify({"error": "Scheme catalogue is unavailable"}), 502

    payload = response.json() if response.content else {}
    return jsonify(
        {
            "query": user_query,
            "schemes": payload,
            "source": "myScheme.gov.in",
            "link": "https://www.myscheme.gov.in",
        }
    )
