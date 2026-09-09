from flask import Blueprint, jsonify, request
from app.farmer_context import farmer_profile
from app.imd import fetch_imd_forecast, fetch_imd_warnings
from app.live_data import fetch_current_weather, fetch_daily_weather

weather_bp = Blueprint("weather", __name__)


@weather_bp.route("/weather", methods=["GET"])
def weather():
    profile = farmer_profile()
    try:
        lat = float(request.args.get("lat") or profile.get("lat") or 0)
        lon = float(request.args.get("lon") or profile.get("lon") or 0)
    except (TypeError, ValueError):
        return jsonify({"error": "lat and lon are required numbers"}), 400
    if not lat or not lon:
        return jsonify({"error": "lat and lon are required numbers"}), 400

    imd = fetch_imd_forecast(lat, lon)
    current = fetch_current_weather(lat, lon)
    daily = fetch_daily_weather(lat, lon)
    warnings = fetch_imd_warnings()
    if not imd and not current:
        return jsonify({"error": "Weather data is unavailable"}), 502
    return jsonify(
        {
            "imd": imd,
            "open_meteo": {"current": current, "daily": daily},
            "warnings": warnings,
        }
    )
