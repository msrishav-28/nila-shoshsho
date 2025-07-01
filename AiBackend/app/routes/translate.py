# translate_bp.py

from flask import Blueprint, request, jsonify
import os
import fitz  # PyMuPDF
import requests
from dotenv import load_dotenv

# RAG imports
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Chroma
from langchain.schema import Document

load_dotenv()

translate_bp = Blueprint('translate_bp', __name__)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_ID = "llama-3.3-70b-versatile"

# ==== VECTOR STORE SETUP ====
EMBED_MODEL = "all-MiniLM-L6-v2"
PERSIST_DIR   = "./app/chromadb"
embeddings    = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
vectorstore   = Chroma(
    persist_directory=PERSIST_DIR,
    embedding_function=embeddings
)
retriever     = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 3}
)

def retrieve_references(query: str) -> list[dict]:
    """
    Fetch top-K docs most similar to `query` and return
    a snippet + (optional) metadata as references.
    """
    docs = retriever.get_relevant_documents(query)
    refs = []
    for doc in docs:
        refs.append({
            "source": doc.metadata.get("source", "<unknown>"),
            "snippet": doc.page_content.strip()[:200] + ("…" if len(doc.page_content) > 200 else "")
        })
    return refs


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
        with fitz.open(stream=pdf_file.read(), filetype="pdf") as doc:
            for page in doc:
                text += page.get_text()
        if not text.strip():
            return jsonify({"error": "PDF appears empty or unreadable."}), 400

        # 2) Retrieve “related” docs for references
        #    Here we use the first 500 characters of the doc as a proxy query:
        refs = retrieve_references(text[:500])

        # 3) Build your Groq prompt (unchanged core logic)
        system_prompt = (
            "You are an expert in explaining agricultural and government documents to rural farmers. "
            "Instead of directly translating, summarize and explain the content in very simple and clear terms "
            f"in the target language ({target_language}). Use a farmer-friendly tone. Preserve any important data or rules, "
            "but avoid complex language. If needed, use bullet points or sections for better clarity."
        )
        prompt = f"Explain the following document in {target_language}:\n\n{text.strip()}"

        payload = {
            "model": MODEL_ID,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": prompt}
            ],
            "temperature": 0.4
        }
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        # 4) Call Groq
        response = requests.post(GROQ_URL, headers=headers, json=payload)
        response.raise_for_status()
        translated_text = response.json()["choices"][0]["message"]["content"]

        # 5) Return both translated doc and references
        return jsonify({
            "translated_document": translated_text,
            "references": refs
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
