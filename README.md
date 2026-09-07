# Nila Shoshsho

The soil's bounty, for your dedication.

Nila Shoshsho is a phone app for Indian smallholder farmers. It gives farming advice in eight languages, using live public data where the code actually fetches it, and Groq language models where the code asks a model instead.

This README describes **this GitHub repository as it is today**. It does not describe a future rewrite.

## What a farmer can do today

After they sign in, the bottom tabs are **Home**, **Scheme**, **Crop Care**, **Market**, and **News**.

- **Home** — the starting screen after login.
- **Scheme** — type a question about government schemes. The advice server answers with Groq, using stored scheme documents when those files are present.
- **Crop Care** — take or pick a plant photo. The advice server sends it to Groq vision and returns a disease reading. Some screens can **read the answer aloud** on the phone (device text-to-speech). That is not full voice control of the app.
- **Market** — mandi prices from **data.gov.in** (AGMARKNET resource). Extra “AI analysis” on that screen currently calls Groq **from the phone**.
- **News** — Google News results through **SerpAPI**, also currently called **from the phone**.
- **Profile, settings, documents, password, language** — account screens after login.
- **Fertilizer, crop calendar, crop suggestion, water, post-harvest** — forms on the phone that call the advice server. Weather for those plans comes from **Open-Meteo**. Soil for fertilizer comes from **OpenEPI**. There is **no Google Calendar sync**.

The in-app **Chatbot** screen is a menu of shortcuts to other screens. It does not send the farmer’s words to an LLM. The CrewAI advisory route on the advice server (`POST /advisory/ask`) exists for that kind of question, but the Chatbot screen does not call it.

Sign-in is **email + password** or **phone + password**. That is not OAuth. Twilio OTP routes exist on the account server if you configure Twilio.

Languages in the UI: English, Hindi, Marathi, Tamil, Bengali, Kannada, Telugu, Malayalam.

## The three moving parts

| Part | Folder | What it is | Default port |
| --- | --- | --- | --- |
| Phone app | `MobileApp/` | React Native (Android / iOS) | Metro bundler |
| Account server | `backend/` | Node.js + Express. Farmers, login, profile pictures, documents, OTP, a weather route | `5001` if you set `PORT` in `.env` (the code falls back to **5000** if `PORT` is missing) |
| Advice server | `AiBackend/` | Python + Flask. Schemes, leaf photos, fertilizer, calendars, post-harvest, CrewAI advisory | **5002** |

Database for accounts: **MongoDB** (`MONGO_URI`). Pictures and PDFs go to **Cloudinary** when those keys are set.

Advice models: **Groq** (Llama family). Scheme lookup can also use a local **Chroma** document store under `AiBackend/app/chromadb`.

## What looks unfinished or risky

Treat these as facts, not a punch list you must fix before reading the rest.

- **`MobileApp/backendConfig.js` is not in this repo.** The phone imports it. Without a local copy, the app will not build. That file currently expected by the phone includes `BACKEND_URL`, `AIBACKEND_URL`, and — today — `DATA_GOV_API_KEY`, `GROQ_API_KEY`, and `SERP_API_KEY`. Putting paid keys in the phone is a real leak risk. Do not commit that file with real values.
- Market “AI analysis” uses Groq **in the browser/phone** (`dangerouslyAllowBrowser`). News uses SerpAPI **in the phone**. Mandi list uses data.gov.in **from the phone**. Those keys belong on a server.
- If the soil lookup fails, fertilizer code **fills default soil numbers** and continues. That can look like a real soil test when it is not.
- The `/api/weather-market` advice route asks Groq to invent structured weather and prices. That is not the same as data.gov.in. The Market tab’s price list is the data.gov.in path.
- Advice `run.py` starts Flask with `debug=True`. Do not use that on a public server.
- Account CORS allows `http://localhost:5001` and a Render URL already in source. Change that before a public launch.
- `backend/.env.example` contains a sample `JWT_SECRET`. Replace it. Never commit a real secret.
- There is no `AiBackend/.env.example`. You must create `AiBackend/.env` yourself (`GROQ_API_KEY` at minimum).
- Empty “demo video” links and old claims (OAuth, full voice navigation, Google Calendar) were removed from this file because they were not true of this code.

Not in this repo: satellite crop stress, offline mode, device push notifications, blockchain, expansion to other countries.

## What you need to run it

- Node.js 18 or newer
- Python 3.11
- A MongoDB database (Atlas or local)
- A Groq API key for the advice server
- Optional: Cloudinary (photos/PDFs), Twilio (OTP SMS), data.gov.in key, SerpAPI key

Copy `backend/.env.example` to `backend/.env` and fill every value. Create `AiBackend/.env` with at least `GROQ_API_KEY=...`.

Create `MobileApp/backendConfig.js` on your machine only. Example **without secrets**:

```js
// Android emulator: 10.0.2.2 reaches this computer.
// iOS simulator: use localhost.
// Physical phone: use this computer's LAN IP.
export const BACKEND_URL = 'http://10.0.2.2:5001/api';
export const AIBACKEND_URL = 'http://10.0.2.2:5002';
export const DATA_GOV_API_KEY = '';
export const GROQ_API_KEY = '';
export const SERP_API_KEY = '';
```

Leave the three keys empty unless you accept that they live on the phone. Mandi, news, and on-device Groq analysis will fail until those keys exist.

## How to run it

Clone:

```bash
git clone https://github.com/msrishav-28/nila-shoshsho.git
cd nila-shoshsho
```

Account server:

```bash
cd backend
npm install
npm run dev
```

Advice server (from the repo root):

```bash
cd AiBackend
pip install -r requirements.txt
python run.py
```

Phone:

```bash
cd MobileApp
npm install
npx react-native run-android
```

Start both servers before you open Crop Care, Schemes, Market, or News.

## How you can check

1. Create an account (email or phone + password).
2. You land on Home with five tabs.
3. Open Scheme, ask one plain question, confirm an answer appears (needs Groq).
4. Open Crop Care, pick a leaf photo, confirm a result or an honest error (needs Groq).
5. Open Market, pick a state, confirm rows from data.gov.in or an error — not a fake table (needs a data.gov.in key in the phone config today).
6. Open a scheme or crop-care answer and tap listen. The phone should speak, or fail honestly if text-to-speech is missing on the device.

If a key is missing, you should see an error. You should not see invented mandi rows from a silent fallback on that Market list.

## License

MIT. See `LICENSE`.
