from flask import Blueprint, request, jsonify
import os
import base64
import requests
from dotenv import load_dotenv
from flask_cors import CORS
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
import json

load_dotenv()

plant_disease_bp = Blueprint('plant_disease_bp', __name__)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Define the Pydantic model with `treatment_required`
class PlantDiagnosis(BaseModel):
    plant: str = Field(..., description="Name of the plant")
    leaf_health: str = Field(..., description="Categorical value indicating the leaf's health (e.g., healthy, mildly affected, severely affected, dead)")
    plant_health: str = Field(..., description="Categorical value indicating the plant or fruit health")
    disease: str = Field(..., description="Name of the disease")
    type_of_disease: str = Field(..., description="Type of disease - fungus, virus, mite, bacteria, insect, or deficiency")
    disease_symptoms: list[str] = Field(..., description="List of symptoms in simple sentences")
    treatment_required: bool = Field(..., description="True if treatment is necessary, else False")

parser = PydanticOutputParser(pydantic_object=PlantDiagnosis)

# Enable CORS for the blueprint
@plant_disease_bp.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@plant_disease_bp.route("/plant-disease", methods=["POST"])
def detect_plant_disease():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    try:
        image_file = request.files['image']
        image_bytes = image_file.read()
        encoded_image = base64.b64encode(image_bytes).decode('utf-8')
        lang = request.form.get('lang', 'English')

        print('Chosen langugae' + lang)

        # Primary prompt to detect disease
        prompt = (
            f"You are an agricultural expert. Analyze the uploaded image of a plant or leaf and extract structured data. Respond in {lang}.\n\n"
            f"{parser.get_format_instructions()}\n\n"
            "The image may include signs of disease or deficiencies. If a tomato fruit is visible, analyze its health as well. "
            "Include whether treatment is required (true/false). Respond only in JSON format matching the schema."
            "Please give reply in {lang} language only"
        )

        payload = {
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded_image}"}}
                ]}
            ],
            "temperature": 0.4
        }

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]

        structured_data = parser.parse(content)
        output_data = structured_data.dict()

        # If treatment is required, get treatment suggestions
        if structured_data.treatment_required:
            treatment_prompt = (
                f"You are an Indian agricultural specialist. The following disease has been identified in {structured_data.plant}:\n"
                f"Disease: {structured_data.disease}\n"
                f"Type: {structured_data.type_of_disease}\n"
                f"Symptoms: {', '.join(structured_data.disease_symptoms)}\n\n"
                f"Provide systematic treatment procedures in India, in {lang}, categorized into:\n"
                "- Organic Treatment\n"
                "- Chemical Treatment\n\n"
                "Be specific, mention commonly used names of treatments, and relevant practices for Indian farmers."
            )

            treatment_payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": f"You are an expert in Indian agricultural treatment practices. Respond in {lang}."},
                    {"role": "user", "content": treatment_prompt}
                ],
                "temperature": 0.4
            }

            treatment_response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=treatment_payload)
            treatment_response.raise_for_status()
            treatment_result = treatment_response.json()
            treatment_content = treatment_result["choices"][0]["message"]["content"]

            output_data["treatment_procedure"] = treatment_content

        return jsonify(output_data), 200

    except requests.exceptions.RequestException as e:
        print(f"API Error: {str(e)}")
        return jsonify({"error": "Error communicating with Groq API. Please try again later."}), 500
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500