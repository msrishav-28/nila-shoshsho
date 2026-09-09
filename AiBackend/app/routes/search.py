from flask import Blueprint, jsonify, request
from app.search_catalog import match_features

search_bp = Blueprint("search", __name__)


@search_bp.route("/search", methods=["GET"])
def search_features():
    query = request.args.get("q") or ""
    if len(query) > 80:
        return jsonify({"error": "Search is too long"}), 400
    results = [
        {
            "id": item["id"],
            "title": item["title"],
            "route": item["route"],
        }
        for item in match_features(query)
    ]
    return jsonify({"query": query, "results": results}), 200
