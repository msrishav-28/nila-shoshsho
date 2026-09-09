from flask import Blueprint, request, jsonify
from app.farmer_context import farmer_profile
from app.live_data import fetch_daily_weather
from app.llm import route_models

postharvest_bp = Blueprint("postharvest_bp", __name__)


@postharvest_bp.route("/postharvest", methods=["POST"])
def postharvest_instructions():
    data = request.json or {}
    profile = farmer_profile()
    crop = data.get("crop")
    harvest_date = data.get("harvest_date")
    region = data.get("region") or profile.get("state") or profile.get("city") or "India"
    lat = data.get("latitude") if data.get("latitude") is not None else profile.get("lat")
    lon = data.get("longitude") if data.get("longitude") is not None else profile.get("lon")
    lang = data.get("lang") or profile.get("lang") or "English"

    if not crop or not harvest_date:
        return jsonify({"error": "Missing 'crop' or 'harvest_date' in request."}), 400
    if lat is None or lon is None:
        return jsonify({"error": "Missing 'latitude' or 'longitude' in request for weather data."}), 400

    weather_info = fetch_daily_weather(lat, lon)
    if not weather_info:
        return jsonify({"error": "Weather data is unavailable"}), 502

    prompt = (
        f"Reply in {lang} only.\n"
        "You are an agricultural expert in post-harvest handling. "
        "Use only the weather numbers given. Do not invent rainfall, humidity, or a lab/sensor schedule. "
        "This is weather plus advice, not a field sensor. "
        "Give practical drying, grading, storage, packaging, and transport steps "
        "for the days in the weather object after harvest.\n"
        f"Crop: {crop}\n"
        f"Harvest date: {harvest_date}\n"
        f"Region: {region}\n"
        f"Weather: {weather_info}\n"
    )
    try:
        advice, model = route_models(prompt, lang)
    except Exception:
        return jsonify({"error": "Post-harvest advice is unavailable"}), 502
    if not advice:
        return jsonify({"error": "Post-harvest advice is unavailable"}), 502
    return jsonify(
        {
            "crop": crop,
            "harvest_date": harvest_date,
            "region": region,
            "weather": weather_info,
            "advice": advice,
            "model": model,
            "source": "Open-Meteo plus advisor",
        }
    ), 200
