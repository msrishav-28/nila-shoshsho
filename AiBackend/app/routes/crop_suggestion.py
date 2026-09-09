from flask import Blueprint, request, jsonify
from app.farmer_context import farmer_profile
from app.live_data import fetch_daily_weather, indian_season
from app.crop_windows import windows_for_season

crop_suggestion_bp = Blueprint("crop_suggestion_bp", __name__)

def get_weather_forecast(lat, lon):
    return fetch_daily_weather(lat, lon)

# Step 4: Route
@crop_suggestion_bp.route("/crop_suggestion", methods=["POST"])
def suggest_crops():
    data = request.json or {}
    profile = farmer_profile()
    lat = data.get("latitude") if data.get("latitude") is not None else profile.get("lat")
    lon = data.get("longitude") if data.get("longitude") is not None else profile.get("lon")
    lang = data.get("lang") or profile.get("lang") or "English"
    region = data.get("region") or profile.get("state") or profile.get("city") or "India"
    land_acres = data.get("land_acres")

    if lat is None or lon is None or land_acres is None:
        return jsonify({"error": "Missing latitude, longitude or land_acres."}), 400

    season = indian_season()
    weather_info = get_weather_forecast(lat, lon)
    if not weather_info:
        return jsonify({"error": "Weather data is unavailable"}), 502
    return jsonify(
        {
            "season": season,
            "region": region,
            "land_acres": land_acres,
            "windows": windows_for_season(season),
            "weather": weather_info,
            "source": "ICAR typical season windows plus Open-Meteo",
        }
    ), 200
