from app.logging_config import log_failure
# translate_bp.py

from flask import Blueprint, request, jsonify
import fitz
from app.llm import AdvisorUnavailable, route_models


translate_bp = Blueprint("translate_bp", __name__)


@translate_bp.route("/translate", methods=["POST"])
def translate_document():
    if "file" not in request.files:
        return jsonify({"error": "No PDF file provided."}), 400

    pdf_file = request.files["file"]
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
            if doc.needs_pass:
                return jsonify(error="Unlock the PDF before submitting it"), 400
            partial = len(doc) > 50
            for i in range(min(len(doc), 50)):
                page = doc[i]
                text += page.get_text()
                if len(text) > 20000:
                    partial = True
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
        if not isinstance(translated_text, str) or not translated_text.strip():
            return jsonify(error="Document explanation unavailable"), 502
        if partial:
            translated_text = (
                "Partial document explanation (first 50 pages or 20,000 characters).\n\n"
                + translated_text
            )
        return jsonify(
            {
                "partial": partial,
                "translated_document": translated_text,
                "model": model,
            }
        ), 200

    except fitz.FileDataError:
        return jsonify(error="Unreadable PDF"), 400
    except AdvisorUnavailable as err:
        return jsonify(error=str(err)), err.status
    except Exception as error:
        log_failure("document_explanation", error)
        return jsonify(
            {"error": "Could not explain this document. Please try again."}
        ), 500
