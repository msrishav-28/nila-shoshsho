import base64
import os
from flask import Blueprint, jsonify, request
import requests
from app.deadline import provider_timeout
from app.speech import SpeechUnavailable, synthesize

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
    "gujarati": "gu-IN",
    "punjabi": "pa-IN",
    "odia": "od-IN",
    "en": "en-IN",
    "hi": "hi-IN",
    "mr": "mr-IN",
    "ta": "ta-IN",
    "bn": "bn-IN",
    "kn": "kn-IN",
    "te": "te-IN",
    "ml": "ml-IN",
    "gu": "gu-IN",
    "pa": "pa-IN",
    "od": "od-IN",
}


def _key():
    key = os.getenv("SARVAM_API_KEY")
    if not key:
        raise RuntimeError("SARVAM_API_KEY is not set")
    return key


def _lang(raw):
    if not isinstance(raw, str) and raw is not None:
        return None
    code = (raw or "english").strip().lower()
    return LANG_MAP.get(code.removesuffix("-in"))


@voice_bp.route("/voice/stt", methods=["POST"])
def speech_to_text():
    if "audio" not in request.files:
        return jsonify({"error": "audio file is required"}), 400
    audio = request.files["audio"]
    if not audio.stream.read(1):
        return jsonify(error="Audio recording is empty"), 400
    audio.stream.seek(0)
    lang = _lang(request.form.get("lang"))
    if lang is None:
        return jsonify(error="Unsupported voice language"), 400
    try:
        response = requests.post(
            "https://api.sarvam.ai/speech-to-text",
            headers={"api-subscription-key": _key()},
            files={
                "file": (
                    audio.filename or "speech.wav",
                    audio.stream,
                    audio.mimetype or "audio/wav",
                )
            },
            data={"model": "saaras:v3", "language_code": lang, "mode": "transcribe"},
            timeout=provider_timeout(TIMEOUT),
            allow_redirects=False,
        )
        response.raise_for_status()
        payload = response.json()
    except RuntimeError:
        return jsonify({"error": "Voice listen is not configured"}), 503
    except requests.RequestException:
        return jsonify({"error": "Voice listen is unavailable"}), 502
    transcript = payload.get("transcript") if isinstance(payload, dict) else None
    if not isinstance(transcript, str) or not transcript.strip():
        return jsonify({"error": "Could not hear speech"}), 502
    return jsonify({"transcript": transcript})


@voice_bp.route("/voice/tts", methods=["POST"])
def text_to_speech():
    body = request.get_json(silent=True) or {}
    text = body.get("text") if isinstance(body, dict) else None
    text = text.strip() if isinstance(text, str) else ""
    if not text:
        return jsonify({"error": "text is required"}), 400
    if len(text) > 2400:
        return jsonify(error="Use at most 2400 characters per speech request"), 400
    lang = _lang(body.get("lang"))
    if lang is None:
        return jsonify(error="Unsupported voice language"), 400
    try:
        audio = synthesize(text, lang)
    except SpeechUnavailable as err:
        return jsonify(error=str(err)), err.status
    return jsonify(audio_base64=base64.b64encode(audio).decode("ascii"), language=lang)
