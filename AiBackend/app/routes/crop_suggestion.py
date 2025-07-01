from flask import Blueprint, request, jsonify
from datetime import datetime
import os
import requests
from dotenv import load_dotenv
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

load_dotenv()

crop_suggestion_bp = Blueprint("crop_suggestion_bp", __name__)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Step 1: Weather Forecast API
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
            "wind_speed_max": data.get("daily", {}).get("wind_speed_10m_max", []),
        }
    except Exception as e:
        print(f"[ERROR] Weather fetch failed: {e}")
        return {}

# Step 2: Determine Season
def get_indian_season():
    month = datetime.now().month
    if 6 <= month <= 9:
        return "Kharif"
    elif 10 <= month <= 2:
        return "Rabi"
    else:
        return "Zaid"

# Step 3: Pydantic Models
class CropDetail(BaseModel):
    crop: str
    expected_yield_per_acre_kg: int
    risk_percent: int
    estimated_total_yield_kg: int

class CropRecommendation(BaseModel):
    season: str
    region: str
    recommendations: list[CropDetail]
    reason: str

parser = PydanticOutputParser(pydantic_object=CropRecommendation)

# Step 4: Route
@crop_suggestion_bp.route("/crop_suggestion", methods=["POST"])
def suggest_crops():
    data = request.json
    lat = data.get("latitude")
    lon = data.get("longitude")
    lang = data.get("lang" , "English")
    region = data.get("region", "India")
    land_acres = data.get("land_acres")

    if lat is None or lon is None or land_acres is None:
        return jsonify({"error": "Missing latitude, longitude or land_acres."}), 400

    season = get_indian_season()
    weather_info = get_weather_forecast(lat, lon)

    # Prompt to LLM
    system_prompt = (
        f"Please reply in {lang} language only. \n"
        " You are an agricultural expert. Given the region, season, weather, and land size, suggest suitable crops.\n"
        "For each crop, include:\n"
        "- expected_yield_per_acre_kg (int)\n"
        "- risk_percent (0-100, int)\n"
        "- estimated_total_yield_kg = yield_per_acre × land_acres\n"
        "Respond only in JSON format according to the schema: "
        f"{parser.get_format_instructions()}"
    )

    user_prompt = (
        f"Region: {region}\n"
        f"Season: {season}\n"
        f"Weather: {weather_info}\n"
        f"Land Area: {land_acres} acres\n"
        "Suggest 2-4 suitable crops with expected yields and risk factors."
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
        reply = response.json()["choices"][0]["message"]["content"]

        result = parser.parse(reply)
        return jsonify(result.dict()), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Parsing failed: {str(e)}"}), 500
