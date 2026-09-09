from flask import Blueprint, request, jsonify
from app.farmer_context import farmer_profile
from app.live_data import fetch_daily_weather
from app.crop_windows import find_window

crop_calendar_bp = Blueprint("crop_calendar_bp", __name__)


@crop_calendar_bp.route("/crop_calendar", methods=["POST"])
def crop_calendar():
    data = request.json or {}
    profile = farmer_profile()
    crop = data.get("crop")
    region = data.get("region") or profile.get("state") or profile.get("city")
    lat = data.get("latitude") if data.get("latitude") is not None else profile.get("lat")
    lon = data.get("longitude") if data.get("longitude") is not None else profile.get("lon")

    if not crop:
        return jsonify({"error": "Missing crop"}), 400
    window = find_window(crop)
    if not window:
        return jsonify({"error": "No official sowing window for that crop"}), 404

    weather_info = None
    if lat not in (None, 0) and lon not in (None, 0):
        weather_info = fetch_daily_weather(lat, lon)
        if not weather_info:
            return jsonify({"error": "Weather data is unavailable"}), 502

    return jsonify(
        {
            "crop": crop,
            "region": region,
            "window": window,
            "weather": weather_info,
            "note": "Local KVK timing can differ from this national window.",
        }
    ), 200
