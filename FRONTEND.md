# Frontend contract

This is the only document the phone team needs to talk to the live servers. Do not put API keys in the app. Do not invent weather, mandi prices, schemes, or pesticide doses when a call fails.

Two processes:

- Account server, Node, default port **5001**. Farmers, login, documents, notifications, logistics jobs.
- Advice server, Flask, default port **5002**. Chat, weather, mandi, voice, crop tools.

Phone config lives in `MobileApp/backendConfig.js`. Defaults are for the Android emulator:

- `BACKEND_URL = 'http://10.0.2.2:5001/api'` (the `/api` suffix is already here)
- `AIBACKEND_URL = 'http://10.0.2.2:5002'` (no `/api` suffix)

iOS simulator: `localhost`. Physical phone: your computer's LAN IP. Production: HTTPS origins only.

Helpers already in `MobileApp/utils/api.js`:

- `accountFetch('/auth/me')` → `GET http://…:5001/api/auth/me`
- `adviceFetch('/weather?lat=…&lon=…')` → `GET http://…:5002/weather?…`

Both attach `Authorization: Bearer <accessToken>` from AsyncStorage (`accessToken` or `user.accessToken`).

## Auth

Neon Auth email/password. There is no phone login and no phone field on the farmer object. No SMS.

After signup or login, save `user.accessToken` and the rest of `user`. Send that token on every later call except:

- `GET /health` on either server
- Account signup and email login

Logout: `POST /api/auth/logout` with the Bearer token if you still have it. Always clear local storage after.

401 means the session is dead. Send the farmer to login. Do not retry with a fake user.

## User object

Returned on signup, login, `GET /me`, profile updates, picture update, and PDF upload.

```json
{
  "_id": "uuid",
  "accessToken": "jwt",
  "username": "string",
  "email": "string",
  "role": "Farmer | Logistics",
  "gender": "Male | Female | Other",
  "profilePic": "url or empty",
  "dob": "YYYY-MM-DD or null",
  "age": 0,
  "location": {
    "address": "",
    "lat": 0,
    "lon": 0,
    "city": "",
    "state": "",
    "country": "",
    "pincode": ""
  },
  "governmentId": { "idName": "", "idValue": "" },
  "languageSpoken": ["Hindi"],
  "bio": "",
  "socialLinks": { "facebook": "", "instagram": "" },
  "documents": ["https://…pdf"],
  "isVerified": false
}
```

`isVerified` is true only when both government-ID name and number are saved. The number is encrypted in the database; the app still receives the plaintext for that farmer.

`lat`/`lon` of `0` means “no location”. Many advice routes treat that as missing.

Allowed spoken languages: Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Malayalam, Kannada, Punjabi, Assamese, English.

UI languages already in the product: English, Hindi, Marathi, Tamil, Bengali, Kannada, Telugu, Malayalam.

## Errors

Account JSON: `{ "success": false, "message": "…" }`.

Advice JSON: `{ "error": "…" }` (sometimes extra fields like `link`, `confidence`, `source`).

Treat these the same in the UI:

- **400** missing or invalid input. Show `message` / `error`.
- **401** no token or bad token. Log out.
- **403** logistics-only action.
- **404** not found.
- **409** email already registered.
- **413** file too large (about 10–12 MB).
- **422** plant photo is not confident enough. Show the error. Do not guess a disease.
- **429** slow down. Wait and retry once.
- **502** an upstream feed (weather, mandi, AI, OSM, IMD) is down. Show the error. Do not fill the screen with sample data.
- **503** that feature is not configured on the server (missing key). Show the error. For schemes, also show `link` (`https://www.myscheme.gov.in`).

Rate limits (do not spam):

- Account: 80 requests / minute / client, plus tighter caps on signup (10 / 15 min) and login (20 / 15 min).
- Advice: 60 / minute, or 20 / minute on `/chatbot/ask`, `/voice/stt`, `/voice/tts`, `/plant-disease`, `/translate`.

When a payload includes `source` and `asOf`, show them. That is how the farmer knows the number is live, not invented.

## Account server (port 5001)

All paths below are the real HTTP paths. From the phone helper, drop the `/api` prefix because `BACKEND_URL` already has it.

### Health

`GET /health` → `{ "ok": true }`. No token. Not rate-limited.

### Auth

`POST /api/auth/signup`

Body: `{ username, email, password, role, gender }`. Password min 8. Role Farmer or Logistics. Do not send a phone number.

**201** `{ success, message, user }`.

`POST /api/auth/login-email` body `{ email, password }` → **200** `{ success, message, user }`.

There is no `/api/auth/login-phone` route.

`POST /api/auth/logout` → `{ success, message }`.

`GET /api/auth/me` Bearer → `{ success, user }`.

`GET /api/auth/profile-completion` Bearer → `{ success, percentage, filledFields, totalFields, message }`.

`PUT /api/auth/update-profile` Bearer. Any subset of:

```json
{
  "username": "min 3 chars",
  "role": "Farmer",
  "gender": "Male",
  "bio": "max 500",
  "dob": "YYYY-MM-DD",
  "location": {
    "address": "",
    "lat": 28.6,
    "lon": 77.2,
    "city": "",
    "state": "",
    "country": "",
    "pincode": "110001"
  },
  "governmentId": { "idName": "Aadhaar", "idValue": "1234" },
  "socialLinks": { "facebook": "", "instagram": "" },
  "languageSpoken": ["Hindi", "English"]
}
```

Unknown languages in the array are dropped. Pincode must be 5–10 digits if sent.

`PUT /api/auth/update-profile-pic` Bearer JSON `{ "profilePic": "<data URL or remote image the server can upload>" }` → `{ success, message, user }`. Needs Cloudinary on the server.

`PUT /api/auth/update-password` Bearer `{ currentPassword, newPassword }` → `{ success, message }`. No user object.

### Documents

`POST /api/upload/upload-doc` Bearer, `multipart/form-data`, field name **`document`**, PDF only, max 10 MB. Magic bytes must be `%PDF`.

**200** `{ success, message, user }` with `user.documents` updated.

### Notifications

These are in-app rows, not device push.

`GET /api/notifications` Bearer → `{ success, notifications: [{ notification_id, title, body, is_read, created_at }] }`. Newest 50.

`PUT /api/notifications/:id/read` Bearer → `{ success: true }`.

`POST /api/notifications/weather-check` Bearer. Uses the farmer's saved lat/lon. Open-Meteo current weather. Writes one notification. Heat ≥ 40°C, cold ≤ 5°C, wind ≥ 50 km/h, otherwise a plain update.

**200** `{ success, title, body, kind, source: "Open-Meteo", asOf }`. `kind` is `heat | cold | wind | update`.

**400** if location is missing. Call this when the farmer opens Home or Notifications, not as a fake local alert. On Alerts, if the profile has lat/lon, call this then reload the list so a weather row appears. If there is no village, keep the empty “add village” copy.

### Logistics jobs

Statuses: `OPEN`, `ACCEPTED`, `DONE`, `CANCELED`.

Job object:

```json
{
  "id": 1,
  "farmerId": "uuid",
  "crop": "Wheat",
  "quantityKg": 500,
  "pickupCity": "",
  "pickupState": "",
  "status": "OPEN",
  "acceptedBy": null,
  "createdAt": "ISO"
}
```

`GET /api/logistics/jobs` Bearer. Farmer sees own jobs. Logistics role sees OPEN jobs plus jobs they accepted.

`POST /api/logistics/jobs` Bearer `{ crop, quantityKg, pickupCity?, pickupState? }`. City/state default from profile. **201** `{ success, job }`.

`PUT /api/logistics/jobs/:id/accept` Logistics only. OPEN → ACCEPTED.

`PUT /api/logistics/jobs/:id/cancel` Farmer who created it, only while OPEN.

`PUT /api/logistics/jobs/:id/done` Logistics who accepted it, only while ACCEPTED.

The account API is live. The phone still needs a Logistics screen that calls these.

## Advice server (port 5002)

Every route except `GET /health` and `GET /` needs Bearer. JSON unless noted. The advice server also calls account `GET /api/auth/me` to fill lat/lon/state/language when the body omits them. Keep `ACCOUNT_URL` pointed at the account server in ops; the phone does not set that.

`GET /health` → `{ "ok": true }`.

### Chat

`POST /chatbot/ask`

```json
{ "question": "When should I irrigate wheat?", "lang": "Hindi", "has_image": false }
```

Question required, max 2000 chars. `has_image` true prefers Gemini.

**200** `{ answer, model, sources }` where `sources` may include `{ source: "live farm feeds", asOf: "now" }` if mandi/IMD/Open-Meteo was injected.

### Search

`GET /search?q=`

Empty `q` returns the full catalog. Max 80 chars. This is jump-to-tool, not web search. The Home search bar should show a one-line caption so it is not mistaken for the internet.

**200** `{ query, results: [{ id, title, route }] }`.

`route` is the React Navigation screen name to open:

- `Scheme`, `Crop Care`, `Market`, `Stores`, `Compare`, `Insights`, `News`, `Fertilizers`, `WaterManagement`, `PostHarvest`, `CropSuggestion`, `Chatbot`, `Documents`, `Logistics`, `Home`, `Notifications`

### Nearby stores

`GET /stores/nearby?lat=&lon=&state=`

Lat/lon required (or a non-zero profile location). OSM shops within 15 km plus AGMARKNET mandi rows for the state.

**200**

```json
{
  "stores": [
    {
      "id": "osm-id",
      "name": "Farm supply",
      "type": "agrarian",
      "address": "",
      "phone": "",
      "lat": 0,
      "lon": 0,
      "mapsUrl": "https://www.openstreetmap.org/…",
      "telUrl": "tel:…"
    }
  ],
  "mandis": [
    {
      "name": "",
      "district": "",
      "state": "",
      "commodity": "",
      "modal_price": "2200",
      "unit": "Rs/quintal",
      "source": "AGMARKNET via data.gov.in",
      "asOf": "arrival_date"
    }
  ],
  "state": "Punjab",
  "storeSource": "OpenStreetMap",
  "mandiSource": "AGMARKNET via data.gov.in"
}
```

Use `mapsUrl` and `telUrl`. Do not invent shops if this returns 502.

### Weather

`GET /weather?lat=&lon=`

**200** `{ imd, open_meteo: { current, daily }, warnings }`.

`imd` or `warnings` may be `null` if IMD is unreachable. Fail only when both IMD and Open-Meteo current are missing (**502**).

Show Open-Meteo as the temperature the farmer can trust. Show an IMD chip only when `imd` is present.

Open-Meteo current:

```json
{
  "temperature": 32.1,
  "humidity": 40,
  "precipitation": 0,
  "windspeed": 12,
  "source": "Open-Meteo"
}
```

Open-Meteo daily:

```json
{
  "dates": ["2026-09-07"],
  "temp_max": [34],
  "temp_min": [24],
  "humidity_max": [80],
  "humidity_min": [40],
  "precipitation": [2.1],
  "wind_speed_max": [18],
  "evapotranspiration": [4.2],
  "source": "Open-Meteo",
  "asOf": "2026-09-07"
}
```

IMD object (when present): `{ station, today_forecast, max_temp, min_temp, rainfall_24h, source: "IMD", asOf, raw }`.

### Mandi prices

Unit is always **Rs/quintal**. Source is **AGMARKNET via data.gov.in**. `asOf` is the arrival date.

Record:

```json
{
  "commodity": "Wheat",
  "variety": "",
  "market": "",
  "district": "",
  "state": "",
  "arrival_date": "",
  "min_price": "2200",
  "max_price": "2400",
  "modal_price": "2300",
  "unit": "Rs/quintal",
  "source": "AGMARKNET via data.gov.in",
  "asOf": ""
}
```

`GET /api/market-prices?state=&district=&commodity=&offset=0&limit=10`

Limit 1–50. **200** `{ records, total, source }`. **503** if `DATA_GOV_API_KEY` is missing.

After the first successful fetch, build state/district/crop dropdowns from those live records (plus All). Keep typed lists only as first-paint fallback. Never fill empty results with sample prices.

`GET /api/market-compare?commodity=&state_a=&state_b=`

**200** `{ commodity, state_a: { state, records }, state_b: { state, records }, source, unit }`. Empty `records` means no rows for that pair, not a fake price.

`POST /api/market-analysis` body `{ records: [ …mandi records… ] }` max 50. Server comments only on those live rows. It must not invent a two-week forecast.

**200** `{ analysis, model, source, asOf }`. On screen, label “comment on these live rows only” and show `source`/`asOf`.

`POST /market/insights` `{ crop, state, lang }`. State can come from profile.

**200** `{ insight, model, records, source, asOf }`. Same no-forecast rule. **503** if mandi key missing. **502** if no rows.

Commodity aliases the server already understands: paddy/dhan/rice, wheat, onion/pyaz, tomato, potato, maize, cotton, soybean/soyabean, groundnut.

### Voice (Sarvam)

`POST /voice/stt` multipart. File field **`audio`**. Optional form `lang` (`english`, `hindi`, `hi`, `en-IN`, …).

**200** `{ transcript }`. **503** if Sarvam key missing. **502** if nothing heard.

`POST /voice/tts` JSON `{ text, lang }`. Text truncated at 2400 chars.

**200** `{ audio_base64, language }` where `language` is like `hi-IN`. Decode base64 and play (expo-av). **503** / **502** as above.

Do not fall back to a second TTS vendor.

### Schemes

`POST /govscheme` `{ query }`.

Success: `{ query, schemes, source: "myScheme.gov.in", link: "https://www.myscheme.gov.in" }`. `schemes` is the myScheme payload; parse titles and links from it into cards. Do not read a `response` field. Do not ship a bundled `schemes.json` as truth.

**503** `{ error, link, source }` when the key is missing or refused. Show the error and a button that opens `link` (`https://www.myscheme.gov.in`).

### Crop photo

`POST /plant-disease` multipart field **`image`**, optional form `lang`. JPEG/PNG, max 6 MB.

**200** `{ plant, disease, leaf_health, confidence, treatment_procedure, model, source: "Gemini vision" }`.

`treatment_procedure` is always “ask KVK”, not a spray recipe. Do not add brand names on the phone.

**422** `{ error, confidence, model, source }` when confidence is below 0.5.

### Fertilizer

`POST /api/fertilizer_recommendation`

```json
{
  "crop": "Wheat",
  "lat": 28.6,
  "lon": 77.2,
  "lang": "Hindi",
  "region": "Punjab",
  "soil_health_card": {
    "soil_ph": 7.1,
    "soil_organic_carbon": 0.4,
    "soil_nitrogen": 0.1,
    "soil_clay": 30,
    "soil_organic_carbon_stock": 40
  }
}
```

The Fertilize form may send optional Soil Health Card numbers (`soil_ph` and related fields). Link the farmer to `https://soilhealth.dac.gov.in` to copy those numbers. Do not scrape the card site.

If `soil_health_card.soil_ph` is sent, that card is used (`soil_source`: “Soil Health Card entered by farmer”). Otherwise OpenEPI grid soil (`soil_source` says it is not the farmer's lab card). Always show `soil_source` on screen. Advice must not name commercial brands or costs.

**200** `{ status: "success", crop, location, soil_data, soil_source, weather_data, recommendation }` where `recommendation` is markdown-ish text.

### Crop calendar and suggestion

`POST /crop_calendar` `{ crop, region?, latitude?, longitude? }`.

**200** `{ crop, region, window, weather, note }`.

`window`:

```json
{
  "crop": "Wheat",
  "season": "Rabi",
  "sow_months": ["November", "December"],
  "harvest_months": ["March", "April"],
  "source": "ICAR typical Rabi wheat window",
  "asOf": "national typical window"
}
```

**404** if the crop has no official window. Do not invent weeks. Known crops: Paddy, Maize, Soybean, Cotton, Groundnut, Wheat, Mustard, Chickpea, Onion, Moong, Watermelon (fuzzy match).

`POST /crop_suggestion` `{ latitude, longitude, land_acres, region?, lang? }`. `land_acres` is required even though it is only echoed.

**200** `{ season, region, land_acres, windows, weather, source }` where `season` is `Kharif | Rabi | Zaid` from today's month and `windows` is the list above for that season.

The phone renders `windows` / `window`, not a `recommendations` or week-by-week `calendar` array. Label the months “national typical, local KVK may differ”. Echo `land_acres` as size only. Keep the 7-day weather overlay.

### Water and post-harvest

Both need live Open-Meteo. Advice is a single text field, plus the weather object. Do not invent a lab or sensor schedule if **502**. On screen, one line: “weather plus advice, not a sensor”.

`POST /water_management`

```json
{
  "crop": "Wheat",
  "latitude": 28.6,
  "longitude": 77.2,
  "soil_type": "loamy",
  "field_size_acres": 2,
  "irrigation_method": "drip",
  "lang": "Hindi"
}
```

**200** `{ crop, soil_type, field_size_acres, irrigation_method, weather, advice, model, source: "Open-Meteo plus advisor" }`.

`POST /postharvest`

```json
{
  "crop": "Wheat",
  "harvest_date": "2026-04-15",
  "latitude": 28.6,
  "longitude": 77.2,
  "region": "Punjab",
  "lang": "Hindi"
}
```

**200** `{ crop, harvest_date, region, weather, advice, model, source: "Open-Meteo plus advisor" }`.

There is no Google Calendar sync.

### News

`GET /news?category=all&state=all&search=&lang=english`

`category`: `all | crops | weather | market | technology | government`.

`state`: `all` or one of andhra pradesh, punjab, haryana, maharashtra, karnataka, madhya pradesh, gujarat, rajasthan, uttar pradesh, tamil nadu, west bengal, bihar, telangana.

**200** `{ news_results: [ SerpAPI google_news items ] }`. **503** if SerpAPI is not configured. Empty list is valid.

### Translate / explain PDF

`POST /translate` multipart field **`file`** (PDF, `%PDF` magic, max 8 MB) and form `target_language`.

**200** `{ translated_document, model }`. This is a farmer-language explanation of the text in the PDF, not a certified translation. Do not invent subsidy amounts on the phone if this fails.

## What the phone still owns

Logistics jobs and `/voice/tts` playback are already in the app. Remaining phone/ops jobs:

1. Point `MobileApp/backendConfig.js` at the live HTTPS servers for a real phone. Emulator defaults stay `10.0.2.2`.
2. Keep location on the profile. Weather, stores, fertilizer, calendar, and alerts need real lat/lon.
3. On 401, log out. On 422/502/503, show the server sentence. Never substitute demo mandi rows, demo weather, or demo diseases.

## What you must never ship in the app

- Perplexity, OpenAI, Gemini, Sarvam, data.gov, SerpAPI, Cloudinary, IMD, myScheme, Neon, or `GOV_ID_KEY` secrets
- Groq
- SMS login
- Invented pesticide brands or doses
- Mock mandi prices

Ops (not phone): Neon + `backend/src/db/schema.sql`, `backend/.env` from `backend/.env.example`, `AiBackend/.env` from `AiBackend/.env.example`, `NODE_ENV=production`, `FLASK_DEBUG=0`, HTTPS.
