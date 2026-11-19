from flask import Blueprint, jsonify, request
from app.farmer_context import farmer_profile
from app.live_data import fetch_current_weather, fetch_daily_weather

weather_bp = Blueprint("weather", __name__)


@weather_bp.route("/weather", methods=["GET"])
def weather():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if lat is None and lon is None:
        profile = farmer_profile()
        lat, lon = profile.get("lat"), profile.get("lon")
    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        return jsonify({"error": "lat and lon are required numbers"}), 400
    if not (-90 <= lat <= 90 and -180 <= lon <= 180) or (lat == 0 and lon == 0):
        return jsonify({"error": "lat and lon are required numbers"}), 400

    current = fetch_current_weather(lat, lon)
    daily = fetch_daily_weather(lat, lon)
    if not current and not daily:
        return jsonify({"error": "Weather data is unavailable"}), 502
    return jsonify(
        {
            "imd": None,
            "open_meteo": {"current": current, "daily": daily},
            "warnings": None,
        }
    )
