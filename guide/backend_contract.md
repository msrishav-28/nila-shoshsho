# Nila Shoshsho — Backend Contract for Frontend Team (2027-Ready)

> **Purpose:** This document tells the frontend team exactly what backend endpoints, fields, and behaviors are changing (or being added) across `backend/` (Account/Records server) and `AiBackend/` (AI advice middle layer).  
> **Scope:** Backend and AI middle layer only. Frontend implementation details (UI/UX, screens, components) are out of scope here.

---

## 1. How to Read This Contract

- **Existing (No Change):** Endpoints that already work and will not change behavior.
- **Modified:** Existing endpoints whose request/response shape or behavior is changing.
- **New:** Brand-new endpoints the frontend must integrate.
- **Deprecated/Removed:** Endpoints that are being retired (frontend must stop calling them).

---

## 2. Account & Records Server (`backend/`, port `5001`)

### 2.1 Existing Endpoints (No Change Expected)

| Endpoint | Method | Purpose | Auth Required |
| :--- | :--- | :--- | :--- |
| `/health` | GET | Server health check | No |
| `/api/auth/signup` | POST | Farmer sign-up (email/password via Neon Auth) | No |
| `/api/auth/login-email` | POST | Farmer login | No |
| `/api/auth/logout` | POST | End session | Yes |
| `/api/auth/me` | GET | Get current farmer profile | Yes |
| `/api/auth/update-profile` | PATCH | Update farmer profile fields | Yes |
| `/api/auth/update-password` | PATCH | Change password | Yes |
| `/api/notifications` | GET | List farmer notifications | Yes |
| `/api/notifications/weather-check` | POST | Trigger weather alert check | Yes |
| `/api/logistics/jobs` | GET | List transport jobs | Yes |
| `/api/logistics/jobs/:id/accept` | POST | Accept a transport job | Yes |
| `/api/logistics/jobs/:id/cancel` | POST | Cancel a transport job | Yes |
| `/api/logistics/jobs/:id/done` | POST | Mark a transport job as done | Yes |
| `/api/upload` | POST | Upload profile pic / documents (Cloudinary) | Yes |

### 2.2 New Endpoints (Phase 3 & 4)

| Endpoint | Method | Purpose | Auth Required | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/plots` | POST | Create a saved farm plot (crop, lat, lon, area, sowing date) | Yes | **New** |
| `/api/plots` | GET | List farmer's saved farm plots | Yes | **New** |
| `/api/plots/:plot_id` | PATCH | Update a farm plot | Yes | **New** |
| `/api/plots/:plot_id` | DELETE | Delete a farm plot | Yes | **New** |
| `/api/agristack/consent` | POST | Start AgriStack consent flow (returns redirect URL) | Yes | **New** |
| `/api/agristack/callback` | GET | Handle AgriStack consent callback (stores verified farmer/land data) | No (OAuth callback) | **New** |
| `/api/agristack/status` | GET | Check if farmer has linked AgriStack verified data | Yes | **New** |

### 2.3 Modified Endpoints (Phase 2 & 4)

| Endpoint | Method | Change | Frontend Action |
| :--- | :--- | :--- | :--- |
| `/api/auth/update-profile` | PATCH | New optional fields: `agristack_farmer_id`, `verified_land_records_json` | Add optional fields to profile edit form (if AgriStack is linked) |
| `/api/notifications` | GET | New `notification_type` field (`"weather"`, `"crop_stress"`, `"market"`, `"insurance"`) | Filter/render notifications by type |
| `/api/notifications/weather-check` | POST | Now also evaluates 6-hour rain/wind spraying windows | Show actionable "Avoid spraying today" notices |

---

## 3. AI Advice Middle Layer (`AiBackend/`, port `5002`)

### 3.1 Existing Endpoints (No Change Expected)

| Endpoint | Method | Purpose | Auth Required |
| :--- | :--- | :--- | :--- |
| `/health` | GET | Server health check | No |
| `/chatbot/ask` | POST | AI farming advisor (grounded in live data) | Yes |
| `/search` | POST | Semantic search over farming knowledge base | Yes |
| `/stores/nearby` | GET | Nearby agri-input stores | Yes |
| `/weather` | GET | Weather + IMD alerts | Yes |
| `/api/market-prices` | GET | Live mandi prices (data.gov.in) | Yes |
| `/api/market-compare` | GET | Compare prices across two states | Yes |
| `/api/market-analysis` | POST | AI summary of live mandi rows | Yes |
| `/market/insights` | GET | Market insights report | Yes |
| `/voice/stt` | POST | Speech-to-text (Sarvam) | Yes |
| `/voice/tts` | POST | Text-to-speech (Sarvam) | Yes |
| `/govscheme` | GET | Government schemes (myScheme) | Yes |
| `/plant-disease` | POST | Crop photo health check (Gemini Vision) | Yes |
| `/api/fertilizer_recommendation` | POST | Fertilizer recommendation | Yes |
| `/crop_calendar` | GET | Crop calendar with 7-day weather overlay | Yes |
| `/crop_suggestion` | POST | Crop suggestion | Yes |
| `/water_management` | POST | Irrigation plan | Yes |
| `/postharvest` | POST | Post-harvest planning | Yes |
| `/news` | GET | Filtered agriculture news (SerpAPI) | Yes |
| `/translate` | POST | Text translation | Yes |

### 3.2 New Endpoints (Phase 1, 2, 3, 4)

| Endpoint | Method | Purpose | Auth Required | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/market-forecast` | GET | 7-to-14-day mandi price forecast (requires `commodity`, `market`, `days` query params) | Yes | **New** |
| `/api/ndvi-status` | GET | Latest NDVI crop-stress status for a saved plot (requires `plot_id`) | Yes | **New** |
| `/api/spray-window` | GET | 6-hour rain/wind spraying window for a plot (requires `plot_id`) | Yes | **New** |
| `/api/pmfby/status` | GET | Crop insurance eligibility, premium, and claim status (via API Setu) | Yes | **New** |
| `/api/pmfby/intimate-loss` | POST | Trigger 72-hour crop-loss intimation guidance (requires `plot_id`, `loss_type`) | Yes | **New** |

### 3.3 Modified Endpoints (Phase 2 & 4)

| Endpoint | Method | Change | Frontend Action |
| :--- | :--- | :--- | :--- |
| `/plant-disease` | POST | Response now includes `severity` (`"low"/"moderate"/"severe"`), `stage` (`"early"/"mid"/"late"`), `safe_next_steps` (array of strings), and `pmfby_alert` (boolean) | Render severity badge, stage indicator, safe next steps checklist, and "Report crop loss to PMFBY" CTA when `pmfby_alert` is `true` |
| `/voice/stt` | POST | Now supports BHASHINI fallback if Sarvam is unavailable | No change needed (transparent fallback) |
| `/voice/tts` | POST | Now supports BHASHINI fallback if Sarvam is unavailable | No change needed (transparent fallback) |
| `/news` | GET | Now cached for 4–6 hours in Redis | No change needed (transparent caching) |
| `/chatbot/ask` | POST | Now includes `farm_plots` NDVI status and 7-day mandi forecast in `live_facts` when relevant | No change needed (transparent grounding) |

---

## 4. Error & Failure Contract (All Servers)

- **`503` (Service Unavailable):** Missing external API key (e.g., `DATA_GOV_API_KEY`, `GEMINI_API_KEY`, `SARVAM_API_KEY`).
- **`502` (Bad Gateway):** External service (Gemini, data.gov.in, Sarvam, Open-Meteo) is down or returned an error.
- **`422` (Unprocessable Entity):** Low-confidence AI output (e.g., `< 0.5` on `/plant-disease`) or sparse historical mandi data (`< 14` distinct arrival dates on `/api/market-forecast`).
- **`429` (Too Many Requests):** Rate limit exceeded (now Redis-backed, so limits persist across server restarts).
- **`401` (Unauthorized):** Missing or invalid Neon Auth JWT.
- **`403` (Forbidden):** Valid JWT but farmer does not own the requested resource (e.g., another farmer's plot).
- **`400` (Bad Request):** Invalid or missing input fields.
- **`404` (Not Found):** Resource does not exist or is outside the farmer's tenancy.

**Frontend Action:** Always render the `error` field from the JSON response body directly to the user (it is already written in plain, farmer-friendly language). Do not invent your own error messages.

---

## 5. Rate Limits (Frontend Must Respect)

- **Global (backend):** 80 requests per minute per IP+token+path.
- **Strict (backend):** 10 sign-ups per 15 min, 20 logins per 15 min.
- **Heavy AI paths (AiBackend):** 20 requests per minute per IP+token+path for `/chatbot/ask`, `/voice/stt`, `/voice/tts`, `/plant-disease`, `/translate`.
- **Standard AI paths (AiBackend):** 60 requests per minute per IP+token+path for everything else.

**Frontend Action:** Implement client-side throttling/debouncing for voice input and chatbot questions to avoid hitting `429` frequently. Show a "Please wait a moment" toast on `429`.

---

## 6. Data & Privacy Contract

- **Government ID (`gov_id_value`):** Stored scrambled (encrypted) in the database; frontend only ever receives the masked last 4 characters.
- **Farmer location (`lat`, `lon`):** Used for weather, soil, and satellite NDVI lookups; never logged in plaintext.
- **AgriStack consent:** Frontend must show a clear consent screen before calling `/api/agristack/consent`, explaining what data will be shared.
- **PMFBY loss intimation:** Frontend must show a confirmation dialog before calling `/api/pmfby/intimate-loss`, since this triggers a real insurance claim workflow.

---

## 7. Verification Checklist for Frontend Team

1. **Sign-in flow:** Verify `/api/auth/signup` and `/api/auth/login-email` still work with the same request/response shape.
2. **Crop photo check:** Upload a leaf photo to `/plant-disease`, confirm the new `severity`, `stage`, `safe_next_steps`, and `pmfby_alert` fields render correctly.
3. **Mandi forecast:** Call `/api/market-forecast?commodity=...&market=...&days=14`, confirm the forecast array, trend, confidence, and source render.
4. **Farm plots:** Create, list, update, and delete a plot via `/api/plots` endpoints.
5. **NDVI & spray window:** Call `/api/ndvi-status` and `/api/spray-window` for a saved plot.
6. **PMFBY:** Call `/api/pmfby/status` and `/api/pmfby/intimate-loss` (with confirmation dialog).
7. **Rate limits:** Verify `429` responses render a "Please wait" toast.
8. **Error rendering:** Verify all `error` fields from the backend render directly to the user without modification.
