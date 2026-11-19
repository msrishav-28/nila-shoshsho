# Nila Shoshsho — Backend & AI Middle-Layer Implementation Plan (2027-Ready)

> **Scope:** `backend/` (Node.js + Express 5 + Neon Postgres) and `AiBackend/` (Python + Flask).  
> **Out of Scope:** `MobileApp/` (Frontend is intentionally excluded from this plan).  
> **Target Audience:** Human engineering teams and autonomous AI coding agents.

---

## 1. Architectural Principles & Non-Negotiable Rules

1. **No Agentic Framework Bloat:** Do **not** add LangChain, CrewAI, or AutoGen. Keep `AiBackend` fast, auditable, and debuggable using direct Python functions and native LLM tool-calling (`AiBackend/app/llm.py`).
2. **Fail Closed on Auth & Data:**
   - Every route in `backend/` and `AiBackend/` (except `/health`) must require a valid Neon Auth JWT (`backend/src/middleware/` and `AiBackend/app/auth.py`).
   - Missing external API keys must return `503` (not configured), never invented or mock data.
   - Low-confidence AI outputs (e.g., `< 0.5` on `/plant-disease` or sparse historical mandi data) must fail honestly with a clear message and KVK/Kisan Call Centre (`1800-180-1551`) fallback.
3. **No Secrets in Client or Git:** All keys (`DATA_GOV_API_KEY`, `GEMINI_API_KEY`, `SARVAM_API_KEY`, `SERPAPI_API_KEY`, `GOV_ID_KEY`, `REDIS_URL`) live strictly in server `.env` files.
4. **Database Schema as Truth:** All schema changes go into `backend/src/db/schema.sql` (or numbered migrations) and must be forward-safe.

---

## 2. Current System Baseline (Verified)

- **Account & Records Server (`backend/`):**
  - Entrypoint: `backend/src/index.js` (Express 5, port `5001`, `assertDb()` on boot).
  - Database: Neon Postgres (`backend/src/db/schema.sql`) with `farmers`, `notifications`, and `logistics_jobs`.
  - Security: `backend/src/middleware/security.js` (currently in-memory rate limiting).
- **AI Advice Middle Layer (`AiBackend/`):**
  - Entrypoint: `AiBackend/app/__init__.py` (Flask, port `5002`, 16 blueprints).
  - Key existing routes: `/plant-disease` (`plant_disease.py`), `/api/market-prices`, `/api/market-compare`, `/api/market-analysis` (`market_prices.py`), `/chatbot/ask` (`chatbot.py`), `/voice/stt`, `/voice/tts` (`voice.py`), `/news` (`news.py`), `/govscheme` (`govscheme.py`).

---

## 3. Phased Implementation Roadmap

### Phase 1: Mandi Price Forecasting (The Missing Pillar)
**Goal:** Add 7-to-14-day mandi price forecasting backed by historical `data.gov.in` (Agmarknet) and eNAM data.

1. **Database (`backend/src/db/schema.sql`):**
   - Add table `mandi_price_snapshots`:
     - `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
     - `commodity TEXT NOT NULL`, `variety TEXT NOT NULL DEFAULT ''`
     - `state TEXT NOT NULL`, `district TEXT NOT NULL`, `market TEXT NOT NULL`
     - `arrival_date DATE NOT NULL`
     - `min_price NUMERIC`, `max_price NUMERIC`, `modal_price NUMERIC NOT NULL`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - Add unique index on `(commodity, market, arrival_date, variety)` for idempotent daily ingestion.
2. **Daily Ingestion Job (`AiBackend/app/jobs/ingest_mandi.py`):**
   - Scheduled daily cron/worker that fetches `DATA_GOV_URL` (`9ef84268-d588-465a-a308-a864a43d0070`) and upserts into `mandi_price_snapshots`.
   - Optional secondary source: eNAM APMC auction feed where available.
3. **Forecasting Endpoint (`AiBackend/app/routes/market_prices.py`):**
   - Add `POST /api/market-forecast` (or `GET /api/market-forecast?commodity=...&market=...&days=14`).
   - Query `mandi_price_snapshots` for the last 60–90 days.
   - **Guardrail:** If fewer than 14 distinct arrival dates exist, return `422` with `{"error": "Not enough historical data to forecast"}`.
   - Run lightweight time-series model (Prophet or LightGBM / exponential smoothing baseline) returning:
     - `forecast`: array of `{date, predicted_modal_price, lower_bound, upper_bound}`
     - `trend`: `"rising" | "falling" | "stable"`
     - `confidence`: float `0..1`
     - `source`: `"AGMARKNET via data.gov.in"`
     - `asOf`: latest `arrival_date`
4. **Tests:** Add unit tests covering sparse data (`422`), valid forecast shape, and input validation.

---

### Phase 2: Crop-Health Vision Hardening
**Goal:** Upgrade `/plant-disease` (`AiBackend/app/routes/plant_disease.py`) from basic JSON to structured, actionable, KVK-safe diagnostics.

1. **Structured Response Schema:**
   - Extend Gemini Vision prompt and response parser to return:
     - `plant`, `disease`, `confidence` (`0..1`), `leaf_health`
     - `severity`: `"low" | "moderate" | "severe"`
     - `stage`: `"early" | "mid" | "late"`
     - `safe_next_steps`: array of non-chemical / cultural practices (e.g., isolate affected leaves, avoid overhead irrigation).
     - `treatment_procedure`: keep strict guardrail (`"Ask your local KVK before spraying. This app does not invent pesticide doses."`).
     - `pmfby_alert`: boolean (`true` if `severity == "severe"` to trigger 72-hour crop-loss intimation guidance).
2. **Image Validation:** Enforce max size (`6 MB`), allowed MIME types (`image/jpeg`, `image/png`, `image/webp`), and strip EXIF metadata before forwarding.
3. **Tests:** Mock `ask_gemini_vision` to test `< 0.5` confidence (`422`), severe disease `pmfby_alert: true`, and malformed JSON fallback (`502`).

---

### Phase 3: Proactive Advisory & Satellite Crop Stress (NDVI)
**Goal:** Move from reactive Q&A to proactive farm-plot monitoring.

1. **Saved Farm Plots (`backend/src/db/schema.sql`):**
   - Add `farm_plots` table (`plot_id`, `farmer_id`, `crop`, `lat`, `lon`, `area_acres`, `sowing_date`, `created_at`).
2. **Satellite NDVI Service (`AiBackend/app/services/satellite.py`):**
   - Integrate **Sentinel Hub Process/Statistical API** (or Copernicus Data Space) using plot `lat`/`lon`.
   - Compute 30-day NDVI trend to detect vegetation stress before visible leaf damage.
3. **Spraying-Window & Weather Alerts (`backend/src/routes/notification.route.js` & `AiBackend/app/routes/weather.py`):**
   - Extend `weather-check` to evaluate 6-hour rain/wind windows and emit actionable notices (e.g., `"Avoid spraying today: high wind/rain expected"`).
4. **Chatbot Grounding (`AiBackend/app/routes/chatbot.py`):**
   - Upgrade `live_facts(question, profile)` to include the farmer's latest `farm_plots` NDVI status and 7-day mandi forecast when relevant.

---

### Phase 4: Voice-First & India DPI Integrations
**Goal:** Maximize accessibility for rural India and connect official government infrastructure.

1. **Voice Pipeline (`AiBackend/app/routes/voice.py`):**
   - Primary: **Sarvam AI** (`bulbul:v4-flash` / `v3`) for low-latency Indian-language STT/TTS.
   - Fallback: **BHASHINI** (Government of India) APIs for 22-language coverage when Sarvam is unavailable or for unsupported dialects.
2. **News Caching (`AiBackend/app/routes/news.py`):**
   - Keep `news_filters.py` + SerpAPI, but cache filtered Indian agriculture/mandi/scheme headlines in Redis for **4–6 hours** to eliminate redundant API spend and speed up response times.
3. **India DPI Readiness (`backend/` & `AiBackend/app/routes/govscheme.py`):**
   - **PMFBY (via API Setu):** Add endpoint to check crop insurance eligibility, premium rates, and claim status.
   - **AgriStack (UFSI):** Prepare consent-based schema fields (`agristack_farmer_id`, `verified_land_records_json`) for when organization sandbox/production credentials are approved.

---

### Phase 5: Production Readiness, Caching & Observability
**Goal:** Eliminate 3am outages and single-instance bottlenecks.

1. **Distributed Redis (Upstash):**
   - Replace in-memory rate limiting in `backend/src/middleware/security.js` and `AiBackend/app/security.py` with Redis-backed sliding-window rate limits.
   - Cache `data.gov.in` responses (1–3 hours), Open-Meteo/IMD weather (30–60 mins), and `/news` (4–6 hours).
2. **Observability:**
   - Add **Sentry** SDK to both `backend/` and `AiBackend/`.
   - Standardize structured JSON logging with `request_id` correlation between `backend/` and `AiBackend/`.
3. **Verification Gate:**
   - `backend/`: `npm test` and `npm run loadtest` (200+ `/health` checks + auth rejection checks).
   - `AiBackend/`: `pytest` across all `*_test.py` files.
   - Confirm HTTPS-only deployment, `NODE_ENV=production`, `FLASK_DEBUG=0`, and `CORS_ORIGINS` locked to production domains.
