# Backend contract for client integration

[OpenAPI](openapi.json) defines routes, request fields, response schemas and errors for the Node account and Flask advice services. [Route inventory](api-contract.json) maps routes to their clients and external dependencies. [Frontend handoff](FRONTEND_HANDOFF.md) describes client behavior and [end-to-end handoff](FULL_STACK_HANDOFF.md) describes release acceptance.

| Surface | Routing |
| --- | --- |
| Android and iOS | Account base ends in `/api`. Advice base has no path prefix. Set `EXPO_PUBLIC_ACCOUNT_API_URL` and `EXPO_PUBLIC_ADVICE_API_URL` to the approved origins. |
| Vercel PWA | The build uses relative paths `/api` and `/advice`. Vercel's `ACCOUNT_API_BASE_URL` ends in `/api` and `ADVICE_API_BASE_URL` has no path prefix. |
| Protected Render staging | Account and advice both require `X-Staging-Key` on application routes. Keep this key in a private integration runner or server-side relay. `/health` is public and checks process liveness. |

Obtain an access token from account signup or sign-in. Send `Authorization: Bearer <accessToken>` to private account and advice routes. Advice verifies the same token and checks the active account session. Successful logout invalidates that session on both services. Apply the account's server-reported review and ownership state in the client.

Handle 400 for invalid input, 401 for missing or expired sessions, 403 for denied actions, 409 for conflicts, 429 for throttling and 502/503 for unavailable dependencies. Honor `Retry-After` when supplied. Use the same `Idempotency-Key` when retrying the same plot creation, logistics job or callback. Preserve a new key for a new user action. Signed file URLs expire after five minutes, so refresh profile data before retrying an old link.

On `GET /weather`, `open_meteo` is the existing response key. Check each section's `source`. An enabled MET Norway fallback is marked `kind: "forecast"` with its valid time, issue time and attribution links. Daily data can be null. Official warnings and IMD forecasts stay unavailable until approved feeds are verified. A missing feed or a sandbox government result cannot establish a fact about a farmer, market or policy.
