from flask import Blueprint, request, jsonify
import os
import requests
from dotenv import load_dotenv
from typing import List

from pydantic import BaseModel, Field
from langchain.output_parsers import PydanticOutputParser

load_dotenv()

crop_calendar_bp = Blueprint("crop_calendar_bp", __name__)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


# -------------------- Pydantic Response Schema --------------------

class Task(BaseModel):
    task_title: str = Field(..., description="Title of the farming task")
    duration: str = Field(..., description="Time duration (e.g. '3 days')")
    description: str = Field(..., description="Detailed description of the task")

class WeekPlan(BaseModel):
    week: int = Field(..., description="Week number")
    tasks: List[Task] = Field(..., description="List of tasks for the week")

class CropCalendar(BaseModel):
    duration_weeks: int = Field(..., description="Total weeks of cultivation")
    weather_summary: str = Field(..., description="Brief weather summary")
    calendar: List[WeekPlan] = Field(..., description="Weekly farming plan")


# -------------------- Helper: Weather Fetch --------------------

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
        response.raise_for_status()
        return response.json().get("daily", {})
    except Exception as e:
        print(f"[ERROR] Weather fetch failed: {e}")
        return {}


# -------------------- Main Route: Crop Calendar --------------------

@crop_calendar_bp.route("/crop_calendar", methods=["POST"])
def crop_calendar():
    data = request.json
    crop = data.get("crop")
    region = data.get("region")
    lat = data.get("latitude")
    lon = data.get("longitude")
    lang = data.get("lang")

    if not crop or not region or lat is None or lon is None :
        return jsonify({"error": "Missing crop, region or coordinates"}), 400

    weather_info = get_weather_forecast(lat, lon)

    parser = PydanticOutputParser(pydantic_object=CropCalendar)
    format_instructions = parser.get_format_instructions()

    system_prompt = (
        "You are an expert agricultural officer. Based on the crop, region, and weather data, generate a detailed "
        "cultivation calendar for the crop over 8–10 weeks. Each week should contain tasks with title, duration, and description. "
        "Include operations like land preparation, sowing, irrigation, fertilization, pest control, weeding, and harvesting.\n"
        f"Use the following format strictly:\n{format_instructions}"
    )

    user_prompt = (
        f"Crop: {crop}\n"
        f"Region: {region}\n"
        f"Weather Forecast: {weather_info}\n"
        f"Please reply in {lang} language only\n"
        "Now generate the farming calendar."
    )

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.4
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
        content = response.json()["choices"][0]["message"]["content"]
        structured_data = parser.parse(content)

        return jsonify(structured_data.dict()), 200

    except Exception as e:
        print(f"[ERROR] Calendar generation failed: {e}")
        return jsonify({"error": str(e)}), 500
