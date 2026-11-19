# Nila Shoshsho Refined 2 backend handoff

The frontend uses the existing account and advice services through `utils/api.js` and `refined/data.js`. Endpoint paths, response fields and status handling live beside the affected screen. Backend work can proceed against a versioned contract while this frontend continues using the current endpoints.

## Contracts to settle before switching services

| Surface | Current frontend behavior | Decision or contract needed |
| --- | --- | --- |
| Authentication and session | Uses email login or signup, the existing bearer token, profile updates and local sign-out on authenticated 401. It accepts masked verification fields. | Agree on production origins, token expiry and refresh, registration and verification states, stable user ID and staging accounts for both roles. Confirm web session strategy, allowed origins and headers. Return masked verification IDs. |
| Farm setup and monitoring | Stores one farm per account on the device. Tools use a saved map point when it matches the farm. Missing observations appear explicitly. | Define farm and plot IDs, CRUD, land units, sowing date format, place lookup and how the active plot feeds other tools. Define observation times, source, usable versus cloudy or missing data, and permission states. |
| Weather, planning and nutrients | Uses existing weather, crop suggestions, national or local calendar, irrigation, post-harvest and nutrient endpoints. Some calls need coordinates. | Define location resolution, input units, supported crop and soil identifiers, structured schedules and provenance. Distinguish unavailable dependencies, no applicable advice and invalid input. |
| Market and nearby stores | Uses existing filters and reported prices. Results include source, arrival date and unit. Outlook shows historical commentary where available and the inadequate-history state. Stores use permission-on-action or a matching saved map point. | Define market and crop IDs, currency and units, historical coverage, and forecast eligibility with horizon, uncertainty range and source. Provide location search or geocoding and a stable store result shape. |
| Schemes and news | Uses existing catalogues with separate empty and unavailable states. Saved schemes stay on the device. | Define IDs, official links, eligibility and freshness, pagination, account-level saved items and when to offer an official-site fallback. |
| Ask Nila | Sends audio to `/voice/stt`. An explicit Send after editable review calls `/chatbot/ask`. Unsent text survives navigation and connection errors in the signed-in session. Read-aloud calls `/voice/tts`. | Confirm audio MIME types, limits, duration, retention, transcript and citation schemas, error and retry rules, and request IDs for timeouts with unknown outcomes. |
| Crop checks | Sends a photo only after review. A 422 shows the uncertain result. The screen explains that saved history is unavailable. | Define accepted uploads, explicit uncertainty codes, result source and regional guidance, consent and retention, and crop-check history. |
| Documents | Uses existing PDF uploads. Translation requires multipart PDF bytes. Saved PDFs can be translated when the HTTPS link is readable, including CORS on web. | Prefer document IDs and server-side access checks for saved-file translation. Confirm signed access, content types, size limits, languages, translation job states and output storage. |
| Transport | Uses existing list, post, accept, cancel and completion job endpoints. | Confirm authorized roles, status transitions, concurrency and retry semantics, pickup location format and notification events. |
| Profile and notifications | Profile edits and photos use existing APIs. Illustration and initials choices, voice language and notification preferences stay on the device. Weather evaluation is opt-in. | Define account-level preference sync, illustration IDs, push-token and web subscription support, and permission and revocation behavior. |

## Service cutover

1. Freeze a versioned API contract with example payloads for success, empty sets, invalid input, unavailable dependencies and expired sessions. Provide a field mapping and staging access.
2. Keep the existing API available during the transition or expose a compatible version at the new service. Move one domain at a time using fixtures and contract checks for both service versions.
3. Exercise sign-in, uploads, location and voice permissions, farm setup, and farmer and partner jobs on Android, iOS and installed web. Confirm status and permission behavior before routing public users to the new services. Roll back routing if a supported flow regresses.
