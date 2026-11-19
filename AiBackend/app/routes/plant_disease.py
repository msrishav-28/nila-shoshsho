from app.logging_config import log_advice_result, log_failure
from flask import Blueprint, request, jsonify
import os
import base64
from io import BytesIO
from PIL import Image, ImageOps, UnidentifiedImageError
import json
import math
from app.llm import ask_gemini_vision


plant_disease_bp = Blueprint("plant_disease_bp", __name__)
OBSERVATION_FIELDS = ("plant", "disease", "leaf_health")
OBSERVATION_SCHEMA = {
    "type": "object",
    "properties": {
        **{field: {"type": "string"} for field in OBSERVATION_FIELDS},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    },
    "required": [*OBSERVATION_FIELDS, "confidence"],
    "additionalProperties": False,
}


def parse_observation(content):
    parsed = json.loads(content)
    if not isinstance(parsed, dict) or set(parsed) != set(
        OBSERVATION_SCHEMA["required"]
    ):
        raise ValueError("Unexpected crop photo response")
    confidence = parsed["confidence"]
    if (
        type(confidence) not in (int, float)
        or not math.isfinite(confidence)
        or not 0 <= confidence <= 1
    ):
        raise ValueError("Invalid crop photo score")
    for field in OBSERVATION_FIELDS:
        value = parsed[field]
        if (
            not isinstance(value, str)
            or len(value) > 300
            or (confidence >= 0.5 and not value.strip())
        ):
            raise ValueError("Invalid crop photo observation")
    return parsed


@plant_disease_bp.route("/plant-disease", methods=["POST"])
def detect_plant_disease():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided."}), 400
    if not os.getenv("GEMINI_API_KEY") or not os.getenv("GEMINI_MODEL"):
        return jsonify({"error": "Crop photo check is not configured"}), 503

    try:
        image_file = request.files["image"]
        image_bytes = image_file.read()
        if len(image_bytes) > 6 * 1024 * 1024:
            return jsonify({"error": "Image is too large"}), 413
        try:
            with Image.open(
                BytesIO(image_bytes), formats=["JPEG", "PNG", "WEBP"]
            ) as image:
                if image.width * image.height > 16_000_000:
                    return jsonify(error="Image dimensions are too large"), 413
                if getattr(image, "n_frames", 1) != 1:
                    return jsonify(error="Use a single still photo"), 400
                clean = ImageOps.exif_transpose(image).convert("RGB")
                clean.thumbnail((2048, 2048))
                output = BytesIO()
                clean.save(output, format="JPEG", quality=88, exif=b"")
        except Image.DecompressionBombError:
            return jsonify(error="Image dimensions are too large"), 413
        except (UnidentifiedImageError, OSError, ValueError):
            return jsonify(error="Use a readable JPEG, PNG or WebP photo"), 400
        encoded_image = base64.b64encode(output.getvalue()).decode("ascii")
        lang = request.form.get("lang", "English")
        if len(lang) > 80:
            return jsonify(error="Invalid language"), 400
        prompt = (
            f"Look at this crop photo. Reply in {lang} as JSON only with keys "
            "plant, disease, confidence (0 to 1), leaf_health. "
            "If you are not sure, set confidence below 0.5. "
            "Return observations only. Do not recommend treatments, brands or application rates."
        )
        content, model = ask_gemini_vision(
            prompt, encoded_image, schema=OBSERVATION_SCHEMA
        )
        parsed = parse_observation(content)
        confidence = parsed["confidence"]
        log_advice_result(model, "uncertain" if confidence < 0.5 else "generated")
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
    except Exception as error:
        log_failure("crop_photo", error)
        return jsonify({"error": "Crop photo check is unavailable"}), 502
