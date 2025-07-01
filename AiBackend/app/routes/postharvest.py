from flask import Blueprint, request, jsonify
import os
import requests
from dotenv import load_dotenv
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

load_dotenv()

postharvest_bp = Blueprint('postharvest_bp', __name__)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Updated Weather Forecast function using daily data
def get_weather_forecast(lat, lon):
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,"
            f"relative_humidity_2m_max,relative_humidity_2m_min"
            f"&forecast_days=7&timezone=auto"
        )
        response = requests.get(url)
        data = response.json()

        return {
            "dates": data.get("daily", {}).get("time", []),
            "temp_max": data.get("daily", {}).get("temperature_2m_max", []),
            "temp_min": data.get("daily", {}).get("temperature_2m_min", []),
            "humidity_max": data.get("daily", {}).get("relative_humidity_2m_max", []),
            "humidity_min": data.get("daily", {}).get("relative_humidity_2m_min", []),
            "precipitation": data.get("daily", {}).get("precipitation_sum", []),
            "wind_speed_max": data.get("daily", {}).get("wind_speed_10m_max", [])
        }
    except Exception as e:
        print(f"[ERROR] Forecast fetch failed: {e}")
        return {}

# Pydantic models
class PlanItem(BaseModel):
    action: str = Field(..., description="The post-harvest activity to perform")
    date: str = Field(..., description="The scheduled date for the activity (YYYY-MM-DD)")
    duration: str = Field(..., description="Estimated duration, e.g., '2 days', '3 hours'")

class WeatherData(BaseModel):
    dates: list[str]
    temp_max: list[float]
    temp_min: list[float]
    humidity_max: list[float]
    humidity_min: list[float]
    precipitation: list[float]
    wind_speed_max: list[float]

class PostHarvestResponse(BaseModel):
    beginning_text: str
    weather: WeatherData
    plan: list[PlanItem]
    conclusion_text: str

parser = PydanticOutputParser(pydantic_object=PostHarvestResponse)

@postharvest_bp.route("/postharvest", methods=["POST"])
def postharvest_instructions():
    data = request.json
    crop = data.get("crop")
    harvest_date = data.get("harvest_date")
    region = data.get("region", "India")
    lat = data.get("latitude")
    lon = data.get("longitude")
    lang = data.get("lang", "English")  # Default to English if lang is not provided

    if not crop or not harvest_date:
        return jsonify({"error": "Missing 'crop' or 'harvest_date' in request."}), 400
    if lat is None or lon is None:
        return jsonify({"error": "Missing 'latitude' or 'longitude' in request for weather data."}), 400

    # Use forecast data
    weather_info = get_weather_forecast(lat, lon)

    # Build prompt with language instruction
    system_prompt = (
        "You are an agricultural expert specializing in post-harvest handling. "
        f"Respond in {lang} language for all textual content (beginning_text, plan actions, duration, and conclusion_text). "
        "Given the crop, harvest date, region, and 7-day weather forecast, provide practical and region-specific post-harvest instructions. "
        "Consider how temperature, humidity, precipitation, and windspeed affect drying, grading, storage, packaging, and transport decisions. "
        "Respond strictly in JSON format following the schema: {}"
    ).format(parser.get_format_instructions())

    user_prompt = (
        f"Crop: {crop}\n"
        f"Harvest Date: {harvest_date}\n"
        f"Region: {region}\n"
        f"Weather Forecast: {weather_info}\n"
        "Provide beginning_text, weather, a list of plan items (action, date, duration), and conclusion_text."
    )

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.5
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        reply_text = response.json()["choices"][0]["message"]["content"]

        result = parser.parse(reply_text)
        return jsonify(result.dict()), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500
    except ValueError as e:
        return jsonify({"error": f"Failed to parse response: {e}"}), 500