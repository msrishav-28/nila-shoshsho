from flask import Blueprint, request, jsonify
from app.farmer_context import farmer_profile
from app.live_data import fetch_daily_weather
from app.llm import route_models

water_management_bp = Blueprint("water_management_bp", __name__)


@water_management_bp.route("/water_management", methods=["POST"])
def suggest_water_management():
    data = request.json or {}
    profile = farmer_profile()
    lat = data.get("latitude") if data.get("latitude") is not None else profile.get("lat")
    lon = data.get("longitude") if data.get("longitude") is not None else profile.get("lon")
    crop = data.get("crop")
    soil_type = data.get("soil_type", "unknown")
    field_size_acres = data.get("field_size_acres")
    irrigation_method = data.get("irrigation_method", "flood")
    lang = data.get("lang") or profile.get("lang") or "English"

    if not all([lat, lon, crop, field_size_acres]):
        return jsonify({"error": "Missing latitude, longitude, crop, or field_size_acres."}), 400

    weather_info = fetch_daily_weather(lat, lon)
    if not weather_info:
        return jsonify({"error": "Weather data is unavailable"}), 502

    prompt = (
        f"Reply in {lang} only.\n"
        "You are an agricultural water adviser. Use only the weather numbers given. "
        "Do not invent rainfall, ET, soil lab values, or a sensor schedule. "
        "This is weather plus advice, not a field sensor. "
        "Give a short irrigation plan for the days in the weather object and 2-3 water-saving tips.\n"
        f"Crop: {crop}\n"
        f"Soil type: {soil_type}\n"
        f"Field size: {field_size_acres} acres\n"
        f"Irrigation method: {irrigation_method}\n"
        f"Weather: {weather_info}\n"
    )
    try:
        advice, model = route_models(prompt, lang)
    except Exception:
        return jsonify({"error": "Water advice is unavailable"}), 502
    if not advice:
        return jsonify({"error": "Water advice is unavailable"}), 502
    return jsonify(
        {
            "crop": crop,
            "soil_type": soil_type,
            "field_size_acres": field_size_acres,
            "irrigation_method": irrigation_method,
            "weather": weather_info,
            "advice": advice,
            "model": model,
            "source": "Open-Meteo plus advisor",
        }
    ), 200
