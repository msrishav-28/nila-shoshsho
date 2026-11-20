# End-to-end integration handoff

Use the latest GitHub `main` for integration. Keep the existing Expo client and backend service boundaries. Capture the frontend and backend commit IDs, Vercel deployment ID, Render deploy IDs and synthetic test run IDs in the release record.

## Connect the environment

1. Start from the [backend contract](BACKEND_CONTRACT.md) and confirm the [OpenAPI](openapi.json) schema against both services. Node serves account, files, reviews and transport. Flask serves advice, weather, market and voice. The same Neon identity and session apply to both.
2. The [account](https://nila-shoshsho-account-staging.onrender.com/health) and [advice](https://nila-shoshsho-advice-staging.onrender.com/health) staging services use a separate Neon branch, a restricted database role, scoped Redis and synthetic data. Take the operator's staging key from trusted server-side tooling. Never bundle it in Expo or browser code.
3. Connect the frontend repository to the existing `nila-shoshsho-pwa` Vercel project with root directory `MobileApp` and use Vercel's cloud build. Both Preview and Production are currently protected demo environments. Their `ACCOUNT_API_BASE_URL`, `ADVICE_API_BASE_URL` and sensitive `NILA_STAGING_GATE_KEY` are already configured. Published CDN rules proxy `/api` and `/advice` to Render and attach the staging key. Browser same-origin rules drop the incoming Origin and Vercel credentials before forwarding. The application bearer token still governs access. Keep Neon, Cloudinary, Redis and AI secrets on Render. [Vercel project settings](https://vercel.com/m-s-rishav-subhins-projects/nila-shoshsho-pwa/settings)
4. On Android and iOS, use the account origin plus `/api` and the advice origin without a path suffix. For protected staging, use an authorized integration runner that supplies the staging key outside the app bundle. Browser traffic that calls either API directly requires an explicitly allowed HTTPS origin. Reverify actual forwarding and rate limiting for the public ingress. [Vercel Functions payload limit](https://vercel.com/docs/functions/limitations#request-body-size)

## Run these journeys across both teams' work

| Area | Use the actual client and record the result |
| --- | --- |
| Identity | Register a synthetic farmer. Sign in, restart the app, verify profile and advice access, then sign out and verify both services reject the revoked bearer. Exercise expired-session reauthentication. |
| Profile and files | Edit a location and language, submit a stale profile version and confirm the conflict. Upload a synthetic PDF and photo, open signed links, verify expiry and confirm a second account gets no references. |
| Plots and transport | Create and retry a plot with one request key. Edit and delete the plot. Verify a pending carrier is denied, an authorized staff decision permits the carrier, one of two claims wins, and revocation removes carrier access. |
| Advice | Check source dates, official-warning unavailability, market provider unavailability, forecast-only weather, and the 502/503 state. Exercise a valid photo, rejected file, model abstention and approved language with controlled providers. |
| Mobile and PWA | Check on at least one actual Android and one iOS device, and install the PWA from Vercel Preview. Check session restoration, offline startup, reconnect, and that user-specific results are never served to another signed-in account. |
| Voice | Verify in-app audio permissions and playback with fixtures. The Bolna pilot needs an enrolled consenting recipient, verified retention settings and an operator-supervised call. Keep the callback feature unavailable outside this pilot. |

## Public promotion

Use [the release record](RELEASE.md) for evidence and [the implementation status](IMPLEMENTATION_STATUS.md) for unfinished capabilities. Record the reviewed Indian states, crops and languages, and keep unreviewed agricultural guidance outside the released scope. Verify hosted daily weather and the enabled weather-dependent advice routes separately from the dashboard fallback. Complete provider approval, privacy and retention checks, capacity on the final ingress, alert delivery, rollout and hosted data recovery. Open traffic only after the product owner and technical reviewer accept the actual client journeys and operational results.

The current Vercel CDN rules target staging in every deployment. Before any public cutover, replace those rules, point Production environment variables to the approved public API origins, and verify the replacement gateway while the deployment is protected. Open public traffic only after those checks pass.
