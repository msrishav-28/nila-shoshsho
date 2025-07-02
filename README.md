# Nila Shoshsho: The soil's bounty, for your dedication

> Empowering Indian farmers with AI-driven, localized, multilingual agricultural companion.

---

## 📌 Our Mission

Agriculture forms the backbone of India’s economy, yet smallholder farmers lack access to localized, real-time farming advice, government schemes, and smart market insights.  
**Nila Shoshsho** addresses this gap with AI-powered, voice-enabled solutions tailored to empower every Indian farmer.

---

## 🎯 Objective

**Goal:**  
- Deliver **personalized crop, weather, and market advice** to farmers in **regional languages**.
- **Simplify access** to **government schemes**, **fertilizer recommendations**, and **post-harvest planning**.
- Using **powerful AI** for **natural language advisory, smart recommendations, and document summarization**.

---

### Our Approach:

- Focused on real-world impact for rural India.
- Built a multilingual, intuitive UI with **voice navigation**.
- Integrated APIs like **Open Meteo**, **Data.gov.in**, **ISRIC**.
- Used **Groq’s ultra-fast LLMs** for **RAG (Retrieval Augmented Generation)** based dynamic advisory.
- Optimized AI calls to keep app lightweight and affordable for farmers.

---

## 🛠️ Tech Stack

### Core Technologies:

-   **Frontend:** React Native, React Navigation
-   **Backend:** Python, Flask, Node.js
-   **AI Engine:** Google Generative AI (Gemini), LangChain
-   **Database:** MongoDB
-   **Authentication:** OAuth 2.0
-   **APIs:** Open Meteo, Data.gov.in, ISRIC Data
-   **Hosting:** Render

---

## ✨ Key Features

-  **Modern & Intuitive UI:** A clean, vibrant interface with beautiful **glassmorphic** elements and **engaging animations** that make the app easy and delightful to use.
-  **Agentic RAG Advisory Chatbot:** Get answers to your farming queries through a smart, conversational AI.
-  **Crop Disease Detection:** Upload an image of your crop to get instant disease detection and health analysis.
-  **Personalized Fertilizer Recommendations:** Receive tailored fertilizer suggestions based on your crop and soil data.
-  **Post-Harvest Planning** with Google Calendar sync.
-  **Smart Market Analysis:** Access real-time market prices, trend predictions, and AI-driven analysis.
-  **Dynamic Crop Calendar:** Generate detailed, week-by-week action plans for your chosen crops.
-  **Multilingual Voice Navigation:** Navigate the app and access information using your voice in your preferred language.
-  **Government Schemes Summarizer:** Understand complex government schemes through simple, clear summaries.
-  **Real-time Weather Forecasts:** Stay updated with the latest weather information for your location.

---

## 🗣️ Supported Languages

Nila Shoshsho supports **8 languages**:

-   English
-   Hindi (हिंदी)
-   Marathi (मराठी)
-   Tamil (தமிழ்)
-   Bengali (বাংলা)
-   Kannada (ಕನ್ನಡ)
-   Telugu (తెలుగు)
-   Malayalam (മലയാളം)

---

- 🎥 **Demo Video Link:** [Watch Here]()

---

## 📱 App Screenshots


<div style="display: flex; justify-content: space-around;">
  <img src="./README_assets/home.jpg" alt="Home Screen" width="30%" />
  <img src="./README_assets/cropcare1.jpg" alt="Crop Disease Detection" width="30%" />
  <img src="./README_assets/cropcare2.jpg" alt="Crop Disease Detection" width="30%" />
</div>
<br />
<div style="display: flex; justify-content: space-around;">
  <img src="./README_assets/market1.jpg" alt="market" width="30%" />
  <img src="./README_assets/water1.jpg" alt="market" width="30%" />
  <img src="./README_assets/water2.jpg" alt="market" width="30%" />
</div>
<br />
<div style="display: flex; justify-content: space-around;">
  <img src="./README_assets/news.jpg" alt="news" width="30%" />
  <img src="./README_assets/market2.jpg" alt="market" width="30%" />
  <img src="./README_assets/market3.jpg" alt="market" width="30%" />
</div>

---

## 🧪 How to Run the Project

### Requirements:

- Node.js v18+
- Python 3.11.0
- MongoDB Atlas or Local
- Groq API Key
- An `.env` configuration file (see `.env.example`).

Here's the updated local setup instructions with the corrected folder structure and descriptions for your project:

---

## Local Setup

## Clone the repository

```bash
git clone [https://github.com/msrishav-28/nila-shoshsho](https://github.com/msrishav-28/nila-shoshsho)
```

## Install dependencies and run the applications

### 1. **Frontend (React Native - Mobile App)**

Navigate to the `MobileApp` folder and install the required dependencies:

```bash
cd MobileApp
npm install
```

Then, start the mobile app:

```bash
npx react-native run-android
```

### 2. **Backend (Node.js)**

Navigate to the `backend` folder and install the Node.js dependencies:

```bash
cd ../backend
npm install
```

Start the backend:

```bash
npm run dev
```

### 3. **AiBackend (Python)**

Navigate to the `AiBackend` folder and install the Python dependencies:

```bash
cd ../AiBackend
pip install -r requirements.txt
```

Run the AI backend:

```bash
flask run
```

---

## 🧬 Future Scope

- **Satellite Integration:** Satellite-driven analysis for soil moisture and crop stress.
- Expansion to Bangladesh, Nepal, Sri Lanka (regional adaptations).
- **Blockchain for Data Privacy:** A long-term vision to secure farmer data.
- **Offline Support:** Access critical information even without an active internet connection through periodic syncing.
- **Push Notifications:** Receive timely alerts for market price changes, weather warnings, and crop calendar reminders.
- **Enhanced Personalization:** A user profile section to tailor content based on your specific crops and preferences.
- **Improved Accessibility (a11y):** Full support for screen readers and other assistive technologies.
---

## 📎 Resources / Credits

- Open Meteo API (weather)
- ISRIC Soil Data
- Data.gov.in Market API
- Groq LLM Models
- Google Generative AI
- Canva for Workflow Diagrams


---

## 🏁 Final Words

**Nila Shoshsho** stands for every farmer, helping them thrive using the power of AI, Groq, and community-driven innovation.

Let's sow the seeds of a smarter tomorrow, together! 🌱

---

# ✨ Thank you! ✨
