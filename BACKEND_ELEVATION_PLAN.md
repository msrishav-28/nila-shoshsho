# Backend Elevation Plan: Preparing for 2027 Standards

This document follows a line-by-line forensic review of all Node.js and Python backend controllers, middlewares, routes, and libraries. It details the precise gaps between the current architecture and enterprise-grade Agentic AI standards, along with the engineering mandates to fix them.

## 1. Forensic Review Findings (The Good)

*   **Cryptographic File Verification (`upload.controller.js`):** The system does not merely trust the `.pdf` extension. It actively inspects the file buffer for the `%PDF` magic bytes before passing it to Cloudinary. This prevents malicious payload execution.
*   **Synchronized JWT Verification:** Both the Node server (`verifyToken.js`) and the Python server (`auth.py`) fetch the JWKS payload from Neon Auth and independently verify the cryptographic signature of the Bearer token.
*   **Fail-Closed State Handling:** In `farmer_context.py`, if the Python server cannot reach the Node server to fetch the user's location, it safely defaults to `0,0` and empty strings, avoiding hard crashes. 
*   **LLM Model Fallbacks (`llm.py`):** The `route_models` function is highly resilient. If Perplexity fails to answer a live-data query, it automatically falls back to OpenAI, and then to Gemini, ensuring high uptime for the farmer.

## 2. The 2027 Agentic Compliance Gaps (The Bad)

### A. Zero Auditability for AI Decisions
**The Problem:** Look at `fertilizer.py` and `plant_disease.py`. They pull live Open-Meteo weather and OpenEPI soil data, feed it to an LLM, and return the string `recommendation` to the mobile app. **None of this is saved.**
If a farmer follows our advice, ruins their crop, and a regulator asks why we recommended 100kg of Urea, we have absolutely no record of the prompt, the sensor data at that millisecond, or the model's output.
**The Fix:** 
We must execute a DB migration to add an `ai_advice_logs` table. Every time the Python server generates advice, it must log: `farmer_id`, `endpoint`, `input_payload`, `model_used`, and `raw_output`.

### B. Naive LLM Routing (`llm.py`)
**The Problem:** The `route_models` function uses hardcoded keyword matching (`if any(hint in lowered for hint in FRESH_HINTS)`) to decide which AI model to use. 
In 2027, an Agentic system cannot rely on `if "weather" in text`. This breaks if the farmer says "will it rain?" (the word "weather" is missing, so it misroutes to a model without live data).
**The Fix:** 
Implement a lightweight semantic router or an LLM intent classifier to decide which specialized Agent (Weather, Agronomy, Market) handles the request. 

### C. Unstructured AI Outputs (Wall of Text)
**The Problem:** Throughout the Python server, we prompt the LLM to return Markdown. While this works for a 2024 chatbot, 2027 Agentic systems require structured data. An agent cannot programmatically book a truck if the harvest date is buried in a markdown paragraph.
**The Fix:**
Migrate `ask_openai` and `ask_gemini` to enforce **Structured Outputs (JSON Schema)**. The LLM must return strict JSON (e.g., `{"fertilizer_type": "Urea", "amount_kg": 100}`). The mobile app will render this data natively.

### D. Coarse Authorization Boundaries
**The Problem:** In Node, the `protectRoute` middleware validates identity (who you are) but does not validate authorization (what you are allowed to do). A `Farmer` token and a `Logistics` token both pass `protectRoute`. While `logistics.controller.js` does check `req.user.role !== "Logistics"` internally, relying on developers to remember to put `if` statements inside every controller is an enterprise security risk.
**The Fix:**
Extract authorization into explicit middleware: `app.use('/jobs/:id/accept', requireRole('Logistics'), acceptJob)`. Furthermore, prepare for **Agent Scopes**. An autonomous agent acting on behalf of a farmer should have a restricted token that allows `logistics:draft` but completely denies `logistics:confirm` without human SMS verification.

## 3. Engineering Execution Plan (Immediate Next Steps)

Before we introduce any new agentic features or UI changes, we execute these three steps to harden the foundation:

1.  **Migration 002 (Audit Logs):** Apply a SQL migration to create the `ai_advice_logs` table.
2.  **Audit Interceptor:** Add a decorator in the Python Flask app (`security.py` or similar) that automatically writes to `ai_advice_logs` via the Node server in the background after any successful LLM generation.
3.  **RBAC Enforcers:** Refactor the Node `auth.middleware.js` to export `requireRole(allowedRoles)` and apply it at the Express router level, completely removing manual role checks from the controllers.

***
*This is the required technical baseline before any agentic autonomy is granted to the system.*
