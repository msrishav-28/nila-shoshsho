from flask import Blueprint, request, jsonify
import os
import base64
import json
from dotenv import load_dotenv
from app.llm import ask_gemini_vision

load_dotenv()

plant_disease_bp = Blueprint('plant_disease_bp', __name__)

@plant_disease_bp.route("/plant-disease", methods=["POST"])
def detect_plant_disease():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided."}), 400
    if not os.getenv("GEMINI_API_KEY"):
        return jsonify({"error": "Crop photo check is not configured"}), 503

    try:
        image_file = request.files["image"]
        image_bytes = image_file.read()
        if len(image_bytes) > 6 * 1024 * 1024:
            return jsonify({"error": "Image is too large"}), 413
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")
        lang = request.form.get("lang", "English")
        mime = image_file.mimetype or "image/jpeg"
        prompt = (
            f"Look at this crop photo. Reply in {lang} as JSON only with keys "
            "plant, disease, confidence (0 to 1), leaf_health. "
            "If you are not sure, set confidence below 0.5. "
            "Do not name pesticide brands."
        )
        content, model = ask_gemini_vision(prompt, encoded_image, mime)
        start = content.find("{")
        end = content.rfind("}")
        parsed = {}
        if start != -1 and end != -1:
            parsed = json.loads(content[start : end + 1])
        confidence = float(parsed.get("confidence") or 0)
        if confidence < 0.5:
            return jsonify(
                {
                    "error": "Not sure from this photo. Ask your KVK.",
                    "confidence": confidence,
                    "model": model,
                    "source": "Gemini vision",
                }
            ), 422
        return jsonify(
            {
                "plant": parsed.get("plant") or "",
                "disease": parsed.get("disease") or "",
                "leaf_health": parsed.get("leaf_health") or "",
                "confidence": confidence,
                "treatment_procedure": "Ask your local KVK before spraying. This app does not invent pesticide doses.",
                "model": model,
                "source": "Gemini vision",
            }
        ), 200
    except Exception:
        return jsonify({"error": "Crop photo check is unavailable"}), 502
