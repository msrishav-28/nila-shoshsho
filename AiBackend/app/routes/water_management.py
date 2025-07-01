from flask import Blueprint, request, jsonify
from datetime import datetime
import os
import requests
from dotenv import load_dotenv
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

load_dotenv()

water_management_bp = Blueprint("water_management_bp", __name__)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Step 1: Weather Forecast API (Reusing Open-Meteo)
def get_weather_forecast(lat, lon):
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,evapotranspiration"
            f"&forecast_days=7&timezone=auto"
        )
        response = requests.get(url)
        data = response.json()
        return {
            "dates": data.get("daily", {}).get("time", []),
            "temp_max": data.get("daily", {}).get("temperature_2m_max", []),
            "temp_min": data.get("daily", {}).get("temperature_2m_min", []),
            "precipitation": data.get("daily", {}).get("precipitation_sum", []),
            "evapotranspiration": data.get("daily", {}).get("evapotranspiration", []),
        }
    except Exception as e:
        print(f"[ERROR] Weather fetch failed: {e}")
        return {}

# Step 2: Pydantic Models
class IrrigationEvent(BaseModel):
    date: str = Field(description="Date of irrigation (YYYY-MM-DD)")
    water_mm: int = Field(description="Water to apply in millimeters")
    method: str = Field(description="Recommended irrigation method (e.g., drip, flood)")
    duration_minutes: int = Field(description="Duration of irrigation in minutes")

class WaterSavingTip(BaseModel):
    tip: str = Field(description="Water-saving technique (e.g., mulching)")
    benefit: str = Field(description="Benefit of the tip (e.g., Saves 20% water)")

class WaterManagementPlan(BaseModel):
    crop: str = Field(description="Crop type (e.g., wheat)")
    soil_type: str = Field(description="Soil type (e.g., loamy)")
    field_size_acres: float = Field(description="Field size in acres")
    irrigation_schedule: list[IrrigationEvent] = Field(description="List of irrigation events for the next 7 days")
    total_water_mm: int = Field(description="Total water needed for the week in millimeters")
    total_water_liters: int = Field(description="Total water needed in liters for the field")
    water_saving_tips: list[WaterSavingTip] = Field(description="List of water-saving techniques")
    explanation: str = Field(description="Farmer-friendly explanation of the plan")

parser = PydanticOutputParser(pydantic_object=WaterManagementPlan)

# Step 3: Route
@water_management_bp.route("/water_management", methods=["POST"])
def suggest_water_management():
    data = request.json
    lat = data.get("latitude")
    lon = data.get("longitude")
    crop = data.get("crop")
    soil_type = data.get("soil_type", "unknown")
    field_size_acres = data.get("field_size_acres")
    irrigation_method = data.get("irrigation_method", "flood")
    lang = data.get("lang", "English")

    if not all([lat, lon, crop, field_size_acres]):
        return jsonify({"error": "Missing latitude, longitude, crop, or field_size_acres."}), 400

    weather_info = get_weather_forecast(lat, lon)

    # Prompt to LLM
    system_prompt = (
        f"Please reply in {lang} language only. \n"
        "You are an agricultural water management expert. Given the crop, soil type, field size, irrigation method, "
        "weather, and location, provide a 7-day irrigation schedule and water-saving tips.\n"
        "For each irrigation event, include:\n"
        "- date (YYYY-MM-DD)\n"
        "- water_mm (int, millimeters to apply)\n"
        "- method (e.g., drip, flood)\n"
        "- duration_minutes (int, irrigation time)\n"
        "Also include:\n"
        "- total_water_mm (int, total for the week)\n"
        "- total_water_liters (int, total for the field, 1 mm = 10,000 liters/acre)\n"
        "- water_saving_tips (list of tips with benefits)\n"
        "- explanation (farmer-friendly summary)\n"
        "Use crop water needs (e.g., wheat: 450 mm/season, rice: 1200 mm/season) and soil properties "
        "(e.g., loamy: 100 mm/m water-holding capacity) to estimate needs. Adjust for weather (precipitation, evapotranspiration).\n"
        "Respond only in JSON format according to the schema: "
        f"{parser.get_format_instructions()}"
    )

    user_prompt = (
        f"Crop: {crop}\n"
        f"Soil Type: {soil_type}\n"
        f"Field Size: {field_size_acres} acres\n"
        f"Irrigation Method: {irrigation_method}\n"
        f"Weather: {weather_info}\n"
        f"Suggest a 7-day irrigation schedule, total water needs, and 2-3 water-saving tips."
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