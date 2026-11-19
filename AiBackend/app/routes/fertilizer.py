from app.logging_config import log_failure
from flask import Blueprint, request, jsonify
import requests
from app.deadline import provider_timeout
import math
from app.farmer_context import farmer_profile
from app.live_data import fetch_current_weather
from app.soil import parse_soil_payload


fertilizer_bp = Blueprint("fertilizer", __name__)

RATE_GUIDANCE = {
    "hi": "खाद की मात्रा तय करने के लिए अपनी मिट्टी की जाँच रिपोर्ट, फसल और उसकी अवस्था की जानकारी स्थानीय कृषि विज्ञान केंद्र को दिखाएँ।",
    "bn": "সারের পরিমাণ জানতে মাটি পরীক্ষার রিপোর্ট, ফসলের নাম ও বৃদ্ধির পর্যায় নিয়ে স্থানীয় কৃষি বিজ্ঞান কেন্দ্রে যোগাযোগ করুন।",
    "mr": "खताचे प्रमाण ठरवण्यासाठी माती परीक्षणाचा अहवाल, पीक आणि वाढीचा टप्पा यांची माहिती स्थानिक कृषी विज्ञान केंद्राला द्या.",
    "ta": "உரத்தின் அளவைத் தீர்மானிக்க மண் பரிசோதனை அறிக்கை, பயிர் மற்றும் அதன் வளர்ச்சி நிலையை உள்ளூர் வேளாண் அறிவியல் மையத்தில் தெரிவிக்கவும்.",
    "te": "ఎరువు మోతాదు కోసం మట్టి పరీక్ష నివేదిక, పంట పేరు, పెరుగుదల దశ వివరాలతో స్థానిక కృషి విజ్ఞాన కేంద్రాన్ని సంప్రదించండి.",
    "kn": "ಗೊಬ್ಬರದ ಪ್ರಮಾಣ ತಿಳಿಯಲು ಮಣ್ಣು ಪರೀಕ್ಷೆಯ ವರದಿ, ಬೆಳೆ ಮತ್ತು ಬೆಳವಣಿಗೆಯ ಹಂತದ ವಿವರಗಳೊಂದಿಗೆ ಸ್ಥಳೀಯ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರವನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    "ml": "വളത്തിന്റെ അളവ് അറിയാൻ മണ്ണ് പരിശോധനാ റിപ്പോർട്ട്, വിള, വളർച്ചാഘട്ടം എന്നിവയുടെ വിവരങ്ങളുമായി പ്രാദേശിക കൃഷി വിജ്ഞാന കേന്ദ്രത്തെ സമീപിക്കുക.",
}


def get_soil_data(lat, lon):
    try:
        url = (
            f"https://api.openepi.io/soil/property?"
            f"lon={lon}&lat={lat}&depths=0-5cm&depths=0-30cm&"
            f"properties=phh2o&properties=nitrogen&properties=soc&properties=clay&"
            f"values=mean"
        )
        response = requests.get(url, timeout=provider_timeout(20))
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
        ocs_response = requests.get(ocs_url, timeout=provider_timeout(20))
        if ocs_response.status_code == 200:
            ocs_type = (ocs_response.headers.get("Content-Type") or "").lower()
            if "json" in ocs_type:
                ocs_soil = (
                    parse_soil_payload(ocs_response.json(), require_complete=False)
                    or {}
                )
                if ocs_soil.get("soil_organic_carbon_stock") is not None:
                    soil_data["soil_organic_carbon_stock"] = ocs_soil[
                        "soil_organic_carbon_stock"
                    ]
        return soil_data

    except Exception as error:
        log_failure("fertilizer", error)
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
        lat = (
            req_json.get("lat")
            if req_json.get("lat") is not None
            else profile.get("lat")
        )
        lon = (
            req_json.get("lon")
            if req_json.get("lon") is not None
            else profile.get("lon")
        )
        region = (
            req_json.get("region")
            or profile.get("state")
            or profile.get("city")
            or "Unknown"
        )
        country = "India"

        crop = str(crop or "").strip()
        if not crop:
            return jsonify({"error": "Crop is required"}), 400
        try:
            lat = float(lat)
            lon = float(lon)
        except (TypeError, ValueError):
            return jsonify({"error": "Add your village in Update Profile"}), 400
        if not (-90 <= lat <= 90 and -180 <= lon <= 180) or (lat == 0 and lon == 0):
            return jsonify({"error": "Add your village in Update Profile"}), 400

        shc = req_json.get("soil_health_card") or {}
        if not isinstance(shc, dict):
            return jsonify(error="Invalid Soil Health Card"), 400
        for name, value in shc.items():
            if name not in {
                "soil_ph",
                "soil_organic_carbon",
                "soil_nitrogen",
                "soil_clay",
                "soil_organic_carbon_stock",
            }:
                return jsonify(error="Unsupported Soil Health Card field"), 400
            if value is None:
                continue
            maximum = (
                14
                if name == "soil_ph"
                else (math.inf if name == "soil_organic_carbon_stock" else 100)
            )
            if (
                type(value) not in (int, float)
                or not math.isfinite(value)
                or not 0 <= value <= maximum
            ):
                return jsonify(error="Invalid Soil Health Card reading"), 400
        if shc and shc.get("soil_ph") is None:
            return jsonify(error="Enter the pH from your Soil Health Card"), 422
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
            soil_source = (
                "OpenEPI typical soils near this map point, not your field lab card"
            )
        weather_data = get_weather(lat, lon)
        if not soil_data:
            return jsonify(
                {
                    "error": "Type your Soil Health Card numbers. Typical soil near this map point is unavailable."
                }
            ), 422
        if not weather_data:
            return jsonify({"error": "Weather data is unavailable"}), 502

        lang = (
            str(req_json.get("lang") or profile.get("lang") or "en")
            .lower()
            .split("-")[0]
        )
        recommendation = RATE_GUIDANCE.get(
            lang,
            (
                "Take a recent field soil test and your crop and growth stage to your local "
                "Krishi Vigyan Kendra for a fertilizer rate. This service has no reviewed "
                "application schedule for this field."
            ),
        )
        return jsonify(
            {
                "status": "success",
                "crop": crop,
                "location": {
                    "lat": lat,
                    "lon": lon,
                    "region": region,
                    "country": country,
                },
                "rate_available": False,
                "soil_data": soil_data,
                "soil_source": soil_source,
                "weather_data": weather_data,
                "recommendation": recommendation,
            }
        )

    except Exception as error:
        log_failure("fertilizer", error)
        return jsonify({"error": "Fertilizer advice is unavailable"}), 500
