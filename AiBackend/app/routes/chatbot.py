from flask import Blueprint, jsonify, request
from app.farmer_context import farmer_profile
from app.live_data import live_facts
from app.llm import AdvisorUnavailable, route_models

chatbot_bp = Blueprint("chatbot", __name__)


@chatbot_bp.route("/chatbot/ask", methods=["POST"])
def chatbot_ask():
    body = request.get_json(silent=True) or {}
    question = (body.get("question") or "").strip()
    prefer_gemini = bool(body.get("has_image"))
    if not question:
        return jsonify({"error": "Question is required"}), 400
    if len(question) > 2000:
        return jsonify({"error": "Question is too long"}), 400
    profile = farmer_profile()
    lang = (body.get("lang") or profile.get("lang") or "English").strip() or "English"
    facts, sources = live_facts(question, profile)
    if facts:
        question = f"{question}\n\nLive data (do not invent over this):\n{facts}"
    try:
        answer, model = route_models(question, lang, prefer_gemini)
    except AdvisorUnavailable as err:
        return jsonify(error=str(err)), err.status
    except Exception:
        return jsonify({"error": "Advisor is unavailable"}), 502
    if not answer:
        return jsonify({"error": "Advisor returned an empty answer"}), 502
    return jsonify({"answer": answer, "model": model, "sources": sources})
