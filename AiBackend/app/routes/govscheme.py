# govscheme_bp.py

from flask import Blueprint, request, jsonify
import requests
import os

from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain_google_genai import ChatGoogleGenerativeAI  # Gemini LLM wrapper
from langchain.schema import BaseRetriever

govscheme_bp = Blueprint('govscheme', __name__)

# ==== CONFIGURATION ====
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_ID = "llama-3.3-70b-versatile"

# ==== VECTOR STORE ====
EMBED_MODEL = "all-MiniLM-L6-v2"
PERSIST_DIR = "./app/chromadb"
COLLECTION = "agri_collection"

embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
vectorstore = Chroma(
    persist_directory=PERSIST_DIR,
    embedding_function=embeddings
)
retriever: BaseRetriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 3})

# ==== RAG Function ====
def retrieve_context(query: str) -> str:
    docs = retriever.get_relevant_documents(query)
    return "\n\n".join(doc.page_content for doc in docs)

# ==== SYSTEM PROMPT ====
SYSTEM_PROMPT = """
You are an assistant that helps Indian farmers understand government schemes.

Given a user's query, retrieve and explain relevant schemes in a simple, localized format.

For each scheme, provide:
- **Scheme Name**
- **Eligibility**
- **Benefits**
- **How to Apply** (brief steps)

At the end of your response, include a Markdown-formatted table summarizing all the schemes with the following columns:
| Scheme Name | Eligibility | Benefits | How to Apply |

Ensure the language is clear and avoids jargon.
"""

@govscheme_bp.route('/govscheme', methods=['POST'])
def get_gov_scheme_info():
    try:
        data = request.get_json()
        user_query = data.get("query", "")

        if not user_query:
            return jsonify({"error": "Query not provided"}), 400

        # Step 1: Retrieve documents using RAG
        context = retrieve_context(user_query)

        # Step 2: Inject context into the system prompt
        enhanced_prompt = f"{SYSTEM_PROMPT}\n\n---\n\nRelevant Documents:\n{context}\n\n---\n\nNow answer the user's question:\n{user_query}"

        # Step 3: Send to Groq API
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": MODEL_ID,
            "messages": [
                {"role": "system", "content": enhanced_prompt},
                {"role": "user", "content": user_query}
            ],
            "temperature": 0.7,
            "max_tokens": 1024
        }

        response = requests.post(GROQ_URL, headers=headers, json=payload)

        if response.status_code != 200:
            return jsonify({"error": "Groq API error", "details": response.json()}), 500

        result = response.json()
        answer = result['choices'][0]['message']['content']

        return jsonify({
            "query": user_query,
            "response": answer
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
