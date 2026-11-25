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

Start both servers for signed-in journeys. For local web development, set `EXPO_PUBLIC_ACCOUNT_API_URL` to `http://localhost:5001/api` and `EXPO_PUBLIC_ADVICE_API_URL` to `http://localhost:5002` before starting Expo. Allow the Expo web origin in the server configuration. The Vercel build uses same-origin routes. The Android emulator reaches the host at `10.0.2.2` by default.

See the [deployment guide](DEPLOYMENT.md) for release configuration and the [release record](../backend/RELEASE.md) for evidence standards.
