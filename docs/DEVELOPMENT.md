# Development

Install the runtime versions declared by each package. The app declares Node 24. The backend verification workflow uses Node 22 and Python 3.11 for the servers. Install dependencies from the checked-in lockfiles and Python constraints.

Prepare a private root `.env.local` using [.env.example](../.env.example). Both backend services read this file locally. Use synthetic users and an isolated database. Inspect the [database setup](../backend/src/db/applySchema.js) before running it.

Use the restricted PostgreSQL serving credential for application queries. Keep the migration credential for approved schema changes. Configure Neon Auth issuer, audience, identity endpoints and signing-key URL together. Staff identities come from the server configuration. Configure private file storage, the government ID encryption key, shared rate limits and provider budgets on the backend. Load hosted credentials through each service's private settings.

Test real handlers with controlled provider responses and isolated records. Include invalid inputs, role and ownership denials, retry and concurrent requests, and unavailable providers. Verify recovery in a separate environment. Keep paid-provider checks opt-in, with a bounded budget and synthetic data.

| Directory | Install | Run | Verify |
| --- | --- | --- | --- |
| `MobileApp` | `npm ci` | `npm run web` | `npm test -- --runInBand`, `npm run lint`, `npm run typecheck` |
| `backend` | `npm ci` | `npm start` | `npm test`, `npm run lint`, `npm run format:check` |
| `AiBackend` | `python -m pip install -r requirements-test.txt` | `python run.py` | `python -m pytest -q app` |

Start both servers for signed-in journeys. Browser development uses the local account and advice ports by default. The Android emulator reaches the host at `10.0.2.2` and the iPhone simulator uses `localhost`. Physical test devices require server addresses they can reach. Set the two `EXPO_PUBLIC_*` API URLs only for builds that need a different endpoint. The Vercel build uses same-origin routes.

The root environment file supplies private credentials to the servers. Set `GEMINI_MODEL=gemini-3.5-flash-lite` and `ADVICE_PRIMARY_PROVIDER=gemini`. Optional OpenAI credentials remain available as a fallback when its account can serve requests.

See the [deployment guide](DEPLOYMENT.md) for release configuration and the [release record](../backend/RELEASE.md) for evidence standards.
