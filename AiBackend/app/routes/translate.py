# translate_bp.py

from flask import Blueprint, request, jsonify
import fitz
from dotenv import load_dotenv
from app.llm import route_models

load_dotenv()

translate_bp = Blueprint('translate_bp', __name__)


@translate_bp.route("/translate", methods=["POST"])
def translate_document():
    if 'file' not in request.files:
        return jsonify({"error": "No PDF file provided."}), 400

    pdf_file       = request.files['file']
    target_language = request.form.get("target_language")
    if not target_language:
        return jsonify({"error": "No target language specified."}), 400

    try:
        # 1) Extract text from PDF
        text = ""
        raw = pdf_file.read()
        if len(raw) > 8 * 1024 * 1024:
            return jsonify({"error": "File is too large"}), 413
        if not raw.startswith(b"%PDF"):
            return jsonify({"error": "Only PDF files are allowed."}), 400
        with fitz.open(stream=raw, filetype="pdf") as doc:
            for page in doc:
                text += page.get_text()
                if len(text) > 20000:
                    break
        text = text[:20000]
        if not text.strip():
            return jsonify({"error": "PDF appears empty or unreadable."}), 400

        prompt = (
            "Explain this agricultural or government document to a farmer in simple words. "
            "Do not invent scheme amounts. Preserve rules that are in the text.\n\n"
            f"{text.strip()}"
        )
        translated_text, model = route_models(prompt, target_language)
        return jsonify({
            "translated_document": translated_text,
            "model": model,
        }), 200

    except Exception as e:
        print("translate error:", e)
        return jsonify({"error": "Could not explain this document. Please try again."}), 500
