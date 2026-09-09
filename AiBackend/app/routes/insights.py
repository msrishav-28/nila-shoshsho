from flask import Blueprint, jsonify, request
from app.farmer_context import farmer_profile
from app.live_data import fetch_mandi_records
from app.llm import route_models

insights_bp = Blueprint("insights", __name__)


@insights_bp.route("/market/insights", methods=["POST"])
def market_insights():
    body = request.get_json(silent=True) or {}
    profile = farmer_profile()
    crop = (body.get("crop") or "").strip()
    state = (body.get("state") or profile.get("state") or "").strip()
    lang = (body.get("lang") or profile.get("lang") or "English").strip()
    if not crop or not state:
        return jsonify({"error": "crop and state are required"}), 400

    records = fetch_mandi_records(commodity=crop, state=state, limit=20)
    if records is None:
        return jsonify({"error": "Market price service is not configured"}), 503
    if not records:
        return jsonify({"error": "No mandi prices for that crop and state"}), 502

    prices = []
    for row in records:
        try:
            prices.append(float(row.get("modal_price")))
        except (TypeError, ValueError):
            continue
    if not prices:
        return jsonify({"error": "No usable mandi prices"}), 502

    as_of = next((row.get("asOf") or row.get("arrival_date") for row in records if row.get("asOf") or row.get("arrival_date")), "")
    question = (
        f"Comment only on these live mandi rows for {crop} in {state} for Indian farmers. "
        "Use only these rows. Do not invent prices. Do not invent a two-week or future price forecast. "
        f"Modal prices in Rs/quintal: min {min(prices):.2f}, max {max(prices):.2f}, "
        f"average {sum(prices) / len(prices):.2f}. Rows: {records[:12]}. "
        "Say what these arrivals show. If sell-now advice is needed, say it depends on these live rows, not a prediction. Under 180 words. "
        f"Answer in {lang}."
    )
    try:
        answer, model = route_models(question, lang, prefer_gemini=False)
    except Exception:
        return jsonify({"error": "Insights are unavailable"}), 502
    return jsonify(
        {
            "insight": answer,
            "model": model,
            "records": records[:12],
            "source": "AGMARKNET via data.gov.in",
            "asOf": as_of,
        }
    )
