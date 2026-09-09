import os
from flask import Blueprint, jsonify, request
import requests

voice_bp = Blueprint("voice", __name__)
TIMEOUT = 30
LANG_MAP = {
    "english": "en-IN",
    "hindi": "hi-IN",
    "marathi": "mr-IN",
    "tamil": "ta-IN",
    "bengali": "bn-IN",
    "kannada": "kn-IN",
    "telugu": "te-IN",
    "malayalam": "ml-IN",
    "en": "en-IN",
    "hi": "hi-IN",
    "mr": "mr-IN",
    "ta": "ta-IN",
    "bn": "bn-IN",
    "kn": "kn-IN",
    "te": "te-IN",
    "ml": "ml-IN",
}


def _key():
    key = os.getenv("SARVAM_API_KEY")
    if not key:
        raise RuntimeError("SARVAM_API_KEY is not set")
    return key


def _lang(raw):
    return LANG_MAP.get((raw or "english").strip().lower(), "en-IN")


@voice_bp.route("/voice/stt", methods=["POST"])
def speech_to_text():
    if "audio" not in request.files:
        return jsonify({"error": "audio file is required"}), 400
    audio = request.files["audio"]
    lang = _lang(request.form.get("lang"))
    try:
        response = requests.post(
            "https://api.sarvam.ai/speech-to-text",
            headers={"api-subscription-key": _key()},
            files={"file": (audio.filename or "speech.wav", audio.stream, audio.mimetype or "audio/wav")},
            data={"model": "saaras:v3", "language_code": lang, "mode": "transcribe"},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except RuntimeError:
        return jsonify({"error": "Voice listen is not configured"}), 503
    except requests.RequestException:
        return jsonify({"error": "Voice listen is unavailable"}), 502
    transcript = payload.get("transcript") or ""
    if not transcript:
        return jsonify({"error": "Could not hear speech"}), 502
    return jsonify({"transcript": transcript})


@voice_bp.route("/voice/tts", methods=["POST"])
def text_to_speech():
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    if len(text) > 2400:
        text = text[:2400]
    lang = _lang(body.get("lang"))
    try:
        response = requests.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={
                "api-subscription-key": _key(),
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "target_language_code": lang,
                "model": "bulbul:v3",
                "speaker": "shubh",
            },
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except RuntimeError:
        return jsonify({"error": "Voice speak is not configured"}), 503
    except requests.RequestException:
        return jsonify({"error": "Voice speak is unavailable"}), 502
    audios = payload.get("audios") or []
    if not audios:
        return jsonify({"error": "Voice speak is unavailable"}), 502
    return jsonify({"audio_base64": audios[0], "language": lang})
