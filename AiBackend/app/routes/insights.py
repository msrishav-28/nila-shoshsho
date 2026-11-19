from flask import Blueprint, jsonify, request
from app.farmer_context import farmer_profile
from app.mandi import fetch_mandi_page
from app.llm import AdvisorUnavailable, route_models

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

    records = fetch_mandi_page(commodity=crop, state=state, limit=20)["records"]
    if not records:
        return jsonify({"error": "No mandi prices for that crop and state"}), 404

    units = {row["unit"] for row in records}
    if len(units) != 1:
        return jsonify(error="Market records have different units"), 422
    unit = units.pop()
    prices = []
    for row in records:
        try:
            prices.append(float(row.get("modal_price")))
        except (TypeError, ValueError):
            continue
    if not prices:
        return jsonify({"error": "No usable mandi prices"}), 502

    as_of = next(
        (
            row.get("asOf") or row.get("arrival_date")
            for row in records
            if row.get("asOf") or row.get("arrival_date")
        ),
        "",
    )
    question = (
        f"Comment only on these live mandi rows for {crop} in {state} for Indian farmers. "
        "Use only these rows. Do not invent prices. Do not invent a two-week or future price forecast. "
        f"Modal prices in {unit}: min {min(prices):.2f}, max {max(prices):.2f}, "
        f"average {sum(prices) / len(prices):.2f}. Rows: {records[:12]}. "
        "Say what these arrivals show. If sell-now advice is needed, say it depends on these live rows, not a prediction. Under 180 words. "
        f"Answer in {lang}."
    )
    try:
        answer, model = route_models(question, lang, prefer_gemini=False)
    except AdvisorUnavailable as err:
        return jsonify(error=str(err)), err.status
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
