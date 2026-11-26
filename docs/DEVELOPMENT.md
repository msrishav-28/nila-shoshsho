# Development

Install the runtime versions declared by each package. The app declares Node 24. The backend verification workflow uses Node 22 and Python 3.11 for the servers. Install dependencies from the checked-in lockfiles and Python constraints.

Prepare a private `.env.local` in the repository root using [.env.example](../.env.example). Both backend services read this file locally. Point the database and identity settings at an isolated environment for tests that create accounts or save records. Use made-up account details. Review the [database setup](../backend/src/db/applySchema.js) before running it on the isolated database.

Use the restricted PostgreSQL serving credential for application queries. Keep the migration credential for approved schema changes. Configure Neon Auth issuer, audience, identity endpoints and signing-key URL together. Staff identities come from the server configuration. Configure private file storage, the government ID encryption key, shared rate limits and provider budgets on the backend. Load hosted credentials through each service's private settings.

Test real handlers with controlled provider responses and isolated records. Include invalid inputs, role and ownership denials, retry and concurrent requests, and unavailable providers. Verify recovery in a separate environment. Keep paid-provider checks opt-in, with a bounded budget and synthetic data.

| Directory | Install | Run | Verify |
| --- | --- | --- | --- |
| `MobileApp` | `npm ci` | `npm run web` | `npm test -- --runInBand`, `npm run lint`, `npm run typecheck` |
| `backend` | `npm ci` | `npm start` | `npm test`, `npm run lint`, `npm run format:check` |
| `AiBackend` | `python -m pip install -r requirements-test.txt` | `python run.py` | `python -m pytest -q app` |

Start both servers for signed-in journeys. Browser development uses account port `5001` and advice port `5002`. The Android emulator reaches the host at `10.0.2.2` and the iPhone simulator uses `localhost`. Physical test devices require server addresses they can reach. Set `EXPO_PUBLIC_ACCOUNT_API_URL` and `EXPO_PUBLIC_ADVICE_API_URL` for builds that use different addresses. These values are visible in the built app. The Vercel build sends requests through `/api` and `/advice` on the website’s own address.

The root environment file supplies private credentials to the servers. The beta uses `GEMINI_MODEL=gemini-3.5-flash-lite` and `ADVICE_PRIMARY_PROVIDER=gemini`. OpenAI is an optional fallback when its account can serve requests. The isolated hosted staging services can use `STAGING_ACCESS_KEY`. Production uses the app’s own authentication and permission checks.

See the [deployment guide](DEPLOYMENT.md) for release configuration and the [release record](../backend/RELEASE.md) for evidence standards.
