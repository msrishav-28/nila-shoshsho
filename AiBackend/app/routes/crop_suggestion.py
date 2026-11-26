import math
from flask import Blueprint, request, jsonify
from app.farmer_context import farmer_profile
from app.live_data import fetch_daily_weather, indian_season
from app.crop_windows import windows_for_season

crop_suggestion_bp = Blueprint("crop_suggestion_bp", __name__)


@crop_suggestion_bp.route("/crop_suggestion", methods=["POST"])
def suggest_crops():
    data = request.json or {}
    profile = farmer_profile()
    lat = (
        data.get("latitude") if data.get("latitude") is not None else profile.get("lat")
    )
    lon = (
        data.get("longitude")
        if data.get("longitude") is not None
        else profile.get("lon")
    )
    region = (
        data.get("region") or profile.get("state") or profile.get("city") or "India"
    )
    land_acres = data.get("land_acres")
    if type(land_acres) not in (int, float):
        return jsonify(error="A numeric field area is required"), 400

    try:
        lat, lon, land_acres = float(lat), float(lon), float(land_acres)
    except (ValueError, TypeError, OverflowError):
        return jsonify(error="Valid coordinates and field area are required"), 400
    if not (-90 <= lat <= 90 and -180 <= lon <= 180) or (lat == 0 and lon == 0):
        return jsonify(error="Valid coordinates are required"), 400
    if not math.isfinite(land_acres) or land_acres <= 0:
        return jsonify(error="A positive field area is required"), 400

    season = indian_season()
    weather_info = fetch_daily_weather(lat, lon)
    return jsonify(
        {
            "season": season,
            "region": region,
            "land_acres": land_acres,
            "windows": windows_for_season(season),
            "weather": weather_info,
            "source": (
                "ICAR typical season windows plus Open-Meteo"
                if weather_info
                else "ICAR typical season windows"
            ),
        }
    ), 200
