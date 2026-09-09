from flask import Blueprint, request, jsonify
import requests
import os
import datetime
from dotenv import load_dotenv
from app.farmer_context import farmer_profile
from app.live_data import fetch_current_weather
from app.llm import route_models
from app.soil import parse_soil_payload

load_dotenv()

fertilizer_bp = Blueprint('fertilizer', __name__)

# ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

FERTILIZER_SYSTEM_PROMPT = """
You are an agronomist advising Indian farmers on nutrient management.
Use only the soil and weather numbers given. Do not invent lab values.

In your response:
1. *Soil Analysis Interpretation*
   - Briefly interpret pH, organic carbon, nitrogen, clay content, and any nutrient imbalances.
2. *Recommended Fertilizer Types & Ratios*
   - Specify the ideal N–P–K ratio(s).
   - Include any secondary (e.g., S, Mg) or micronutrients if warranted.
   - Use generic nutrient names only (urea, DAP, MOP, SSP, compost). Do not name commercial brands.
3. *Application Rates & Units*
   - Give application rates in kg/ha or kg/acre.
   - Break down per application event if split-dosing is recommended.
4. *Timing & Method*
   - Recommend best timing (pre-plant, basal, top-dress) aligned with local climate and crop phenology.
   - Suggest application methods (broadcast, banding, foliar spray, fertigation).
5. *Local Context*
   - Note that local KVK or a soil-testing lab may adjust rates.
   - Do not give prices, brand names, or cost estimates.
6. *Environmental & Safety Precautions*
   - Warn about leaching/runoff risks in given soil texture and weather.
   - Recommend practices to minimize environmental impact.
7. *Additional Soil Amendments*
   - If pH is suboptimal, include liming or acidifying steps.
   - Suggest organic options (compost, green manures) where beneficial.
8. *Expected Outcomes*
   - Describe likely crop response in plain language. Do not invent a guaranteed yield.
9. *Summary Table*
   At the end, include a Markdown table with columns:
   | Component           | Recommendation               | Rate         | Timing/Method               | Notes                            |
   |---------------------|------------------------------|--------------|-----------------------------|----------------------------------|
   | e.g. Urea (46% N)   | Basal + Top-dress           | 100 kg/ha    | Pre-plant; 30 days after sowing | Use split application to reduce volatilization |

Use clear language and Indian units. Never invent a Soil Health Card.
"""

# ─── LLM FUNCTION ─────────────────────────────────────────────────────────────

def get_fertilizer_recommendation(data, crop, lang):
    user_prompt = f"""
Please answer in {lang} language only.
Use only the soil and weather numbers given. Do not invent lab values.
Provide a fertilizer recommendation for the crop: *{crop}* using the following data:

Location:
Region: {data['location']['region']}, Country: {data['location']['country']}

Soil Data:
- pH: {data['soil_data']['soil_ph']}
- Organic Carbon: {data['soil_data']['soil_organic_carbon']}%
- Nitrogen: {data['soil_data']['soil_nitrogen']}%
- Clay content: {data['soil_data']['soil_clay']}%
- Organic Carbon Stock: {data['soil_data']['soil_organic_carbon_stock']} Mg/ha

Weather Data:
- Temperature: {data['weather_data']['temperature']}°C
- Humidity: {data['weather_data']['humidity']}%
- Precipitation: {data['weather_data']['precipitation']} mm
- Windspeed: {data['weather_data']['windspeed']} km/h

Timestamp: {data['timestamp']}
"""

    answer, _model = route_models(FERTILIZER_SYSTEM_PROMPT + "\n\n" + user_prompt, lang)
    return answer

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def get_soil_data(lat, lon):
    try:
        url = (
            f"https://api.openepi.io/soil/property?"
            f"lon={lon}&lat={lat}&depths=0-5cm&depths=0-30cm&"
            f"properties=phh2o&properties=nitrogen&properties=soc&properties=clay&"
            f"values=mean"
        )
        response = requests.get(url, timeout=20)
        if response.status_code != 200:
            return None
        content_type = (response.headers.get("Content-Type") or "").lower()
        if "json" not in content_type:
            return None
        data = response.json()
        soil_data = parse_soil_payload(data)
        if not soil_data:
            return None

        ocs_url = (
            f"https://api.openepi.io/soil/property?"
            f"lon={lon}&lat={lat}&depths=0-30cm&properties=ocs&values=mean"
        )
        ocs_response = requests.get(ocs_url, timeout=20)
        if ocs_response.status_code == 200:
            ocs_type = (ocs_response.headers.get("Content-Type") or "").lower()
            if "json" in ocs_type:
                ocs_soil = parse_soil_payload(ocs_response.json()) or {}
                if ocs_soil.get("soil_organic_carbon_stock") is not None:
                    soil_data["soil_organic_carbon_stock"] = ocs_soil[
                        "soil_organic_carbon_stock"
                    ]
        return soil_data

    except Exception:
        return None

def get_weather(lat, lon):
    return fetch_current_weather(lat, lon)

# ─── ROUTE: FERTILIZER RECOMMENDATION ─────────────────────────────────────────

@fertilizer_bp.route("/api/fertilizer_recommendation", methods=["POST"])
def fertilizer_route():
    try:
        req_json = request.get_json() or {}
        profile = farmer_profile()
        crop = req_json.get("crop")
        lat = req_json.get("lat") or profile.get("lat")
        lon = req_json.get("lon") or profile.get("lon")
        lang = req_json.get("lang") or profile.get("lang") or "English"
        region = req_json.get("region") or profile.get("state") or profile.get("city") or "Unknown"
        country = "India"

        crop = str(crop or "").strip()
        if not crop:
            return jsonify({"error": "Crop is required"}), 400
        try:
            lat = float(lat)
            lon = float(lon)
        except (TypeError, ValueError):
            return jsonify({"error": "Add your village in Update Profile"}), 400
        if not lat or not lon:
            return jsonify({"error": "Add your village in Update Profile"}), 400

        shc = req_json.get("soil_health_card") or {}
        if shc.get("soil_ph") is not None:
            soil_data = {
                "soil_ph": shc.get("soil_ph"),
                "soil_organic_carbon": shc.get("soil_organic_carbon"),
                "soil_nitrogen": shc.get("soil_nitrogen"),
                "soil_clay": shc.get("soil_clay"),
                "soil_organic_carbon_stock": shc.get("soil_organic_carbon_stock"),
            }
            soil_source = "Soil Health Card entered by farmer"
        else:
            soil_data = get_soil_data(lat, lon)
            soil_source = "OpenEPI typical soils near this map point, not your field lab card"
        weather_data = get_weather(lat, lon)
        if not soil_data:
            return jsonify(
                {
                    "error": "Type your Soil Health Card numbers. Typical soil near this map point is unavailable."
                }
            ), 422
        if not weather_data:
            return jsonify({"error": "Weather data is unavailable"}), 502

        input_data = {
            "location": {
                "lat": lat,
                "lon": lon,
                "region": region,
                "country": country
            },
            "soil_data": soil_data,
            "weather_data": weather_data,
            "timestamp": datetime.datetime.now().isoformat()
        }

        recommendation = get_fertilizer_recommendation(input_data, crop, lang)

        return jsonify({
            "status": "success",
            "crop": crop,
            "location": input_data["location"],
            "soil_data": soil_data,
            "soil_source": soil_source,
            "weather_data": weather_data,
            "recommendation": recommendation
        })

    except Exception:
        return jsonify({"error": "Fertilizer advice is unavailable"}), 500
