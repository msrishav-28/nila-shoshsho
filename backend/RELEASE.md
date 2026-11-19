# Backend release execution

The backend is available on protected Render staging for synthetic integration testing. Use FRONTEND_HANDOFF.md and openapi.json as the integration handoff. The public-release acceptance checks below remain in effect.

## Local verification

In backend/, use Node 22, run npm ci, npm run lint, npm run format:check and npm test. Tests use signed fixture identities, disposable PostgreSQL and controlled providers. npm audit --omit=dev checks the production lockfile.

In AiBackend/, use a Python 3.11 virtual environment, install requirements-test.txt, run python -m ruff check app run.py readiness.py sarvam_check.py --select F, python -m ruff format --check app run.py readiness.py sarvam_check.py, python -m pytest -q app and python -m pip check. python -m pip_audit -r requirements.txt checks the production dependency set. Constraints record the locally resolved versions.

GitHub Actions ran these checks and built both Linux containers successfully for commit `37ae3a7`. [Backend verification run](https://github.com/msrishav-28/nila-shoshsho/actions/runs/44603807150)

## Verification record — 20 November 2026

| Gate | Evidence |
| --- | --- |
| Local tests and quality checks | PASS. 26 Node and 56 Python tests, configured lint and formatting, OpenAPI validation, and Python dependency consistency. Both production dependency audits found zero known vulnerabilities at the time of the run. |
| Signed fixture load | PASS. 220 health requests per service and 12 signed reads per service at up to 12 in flight. Of 220 unsigned advice requests, 48 were rejected with 401 and 172 were throttled with 429. No paid endpoints were used. |
| Live provider checks | PASS for Neon synthetic sign-in and logout across both APIs, one Sarvam synthesis, and one Gemini synthetic-image schema check. Other enabled provider journeys still need a staging smoke test. |
| Neon data recovery | PASS for restoring a snapshot to an isolated branch and reading synthetic records with restricted runtime permissions. |
| Shared Redis | PASS from the local services. A scoped Upstash token handled atomic counters and cache reads and writes. Direct and scripted access outside the application prefix was denied. |
| Cloudinary upload and delivery | PASS against Cloudinary via the real account handlers with synthetic users. Signed files downloaded, expired links were rejected, another account received no file links, and unsigned originals and image variants were blocked. Synthetic provider assets were removed. |
| Bolna pilot | PASS for account access and dedicated agent provisioning. The provider reported the agent processed. A call to a consenting enrolled recipient is still pending. |
| Saved farm plots | PASS through the account routes on the Neon demo database using the restricted runtime role. Concurrent requests with one idempotency key returned the same plot. The synthetic plot was updated and removed. |
| Clean Linux verification | PASS for clean dependency installs, lint, formatting and all 81 tests in an isolated Ubuntu scratch directory with no production configuration. |
| Render staging | PASS. Workspace Blueprint validation and container startup completed. Both APIs returned health status 200, gated calls without the staging key returned 404, and gated calls without identity returned 401. |
| Hosted identity and plots | PASS. Synthetic signup, sign-in, signed cross-service advice search, concurrent plot replay, update and deletion, and sign-out with revocation in both APIs. |
| Hosted private media | PASS. The hosting account API uploaded a synthetic PDF and photo. Signed delivery returned both assets, a second account received no links, and unsigned originals and image variants returned 401. Both assets were removed. |
| Public release | OPEN. Requires broader hosted provider journeys, production proxy and capacity verification, alerts, recovery and agricultural review for the enabled scope. |

## Configure a working demo

1. The project's Neon database is initialized and .env.local contains the serving role and Auth configuration. Use the owner credential DATABASE_MIGRATION_URL only for an explicit schema setup. On a new environment, apply the schema before starting services and grant the runtime role the required table and sequence privileges.
2. Supply GOV_ID_KEY as a securely generated encryption key and configure Cloudinary. Apply the schema before hosting so it accepts authenticated image cleanup reservations. The live demo database already has that constraint. Add actual staff account UUIDs to STAFF_USER_IDS. Use the review endpoint to approve synthetic carriers. Keep all credentials out of source, screenshots and logs.
3. Set ACCOUNT_URL in advice to the reachable account origin. Configure the enabled provider keys from the root .env.example. Set GEMINI_MODEL to a supported model evaluated for this demo. A missing configuration returns an explicit unavailable response.
4. For exactly one Sarvam request, enter SARVAM_API_KEY locally, then run python sarvam_check.py from AiBackend using its virtual environment. The command has zero automatic retries. It writes a successful Hindi WAV to a temporary path for playback.
5. Run the real profile, document, transport and advice journeys. Confirm the emitted source dates and the expiry of private viewing links. A provider fixture passing in tests does not establish live integration success.

## Operating controls

Production account uses NODE_ENV=production. Advice uses FLASK_ENV=production and FLASK_DEBUG=0. Configure HTTPS, CORS_ORIGINS and verified proxy addresses for the actual host. Account trusts only TRUSTED_PROXY_CIDRS. Advice pre-auth limits currently apply to the immediate peer, so a shared proxy must have its ingress limiting and forwarding design tested before public traffic.

Both production services require UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Counter failures reject guarded requests. Cache failure may fall back to a normal bounded provider request. Weather caches expire after five or fifteen minutes, price caches after one hour and news after four hours. Source dates remain separate from cache lifetime.

The Open-Meteo free endpoint is for qualifying noncommercial usage. Keep the attribution visible and verify usage and capacity before expanding the deployment. Official IMD warnings remain unavailable until access, district mapping and alert samples have passed verification. [Open-Meteo terms](https://open-meteo.com/en/terms) · [IMD API reference](https://api.imd.gov.in/public/api_reference.html)

Set PAID_REQUESTS_PER_DAY to the approved request allowance. It covers all users per UTC day and is consumed on admission, including failed attempts. Model fallback can issue several provider requests. Set monetary ceilings in provider accounts. Use exact comma-separated DISABLED_ADVICE_PATHS to pause paid features, and restart workers after changing their environment.

Schedule node scripts/cleanup-uploads.mjs --confirm from the account container on a controlled maintenance schedule. It handles up to twenty unlinked uploads older than an hour and removes up to two thousand expired revocation records and two thousand expired session records per run. Failed upload cleanup leaves pending records for retry.

Run npm run ready and python readiness.py privately on their respective hosts to check core dependencies. Keep /health for process liveness. Configure monitoring from the structured request and provider-failure events. Alert delivery and on-call ownership must be exercised on the selected host.

The advice container uses two workers with two threads each. Size memory and concurrency from load measurements, including large valid photos and PDFs. Give account shutdown at least forty seconds to finish in-flight work. Persistent upload reservations allow recovery after an interrupted request.

## Hosted staging

The root render.yaml describes two Singapore Docker web services on a free staging plan with automatic deploys off. Provision against an isolated Neon environment. Set the same random STAGING_ACCESS_KEY of at least 32 bytes on both services, and set ACCOUNT_URL on advice to the account service's HTTPS origin. Send the key as X-Staging-Key from a trusted test runner for every request other than /health. Keep ordinary user authentication enabled. A configured key also separates Redis keys into the `nila:staging:` namespace. Verify that requests without the key receive 404 and use only synthetic users. [Render Blueprint reference](https://render.com/docs/blueprint-spec)

The staging deployment uses a separate Neon Auth and PostgreSQL branch, its own restricted application role, and a separate encryption key. Keep the staging key in local or server-side tooling. [Account liveness](https://nila-shoshsho-account-staging.onrender.com/health) · [Advice liveness](https://nila-shoshsho-advice-staging.onrender.com/health)

For a Vercel-hosted web/PWA, point the client to the two Render HTTPS origins and allow its Vercel origin on both APIs. The existing file sizes can exceed Vercel Functions' 4.5 MB payload limit. A migration of these upload routes to Vercel Functions would need its own upload and download design. [Vercel Functions limits](https://vercel.com/docs/functions/limitations#request-body-size)

## Public-release acceptance

Use synthetic accounts and an isolated hosted environment to prove actual identity sign-in/sign-out and token expiry, private storage delivery and expiry, approved/revoked carrier permissions, simultaneous job claims, retry safety, owner isolation, provider outage behavior and every enabled advice route.

Run authenticated load against controlled providers before directing traffic to paid/government APIs. npm run loadtest is restricted to local fixtures. Start with fresh counters. LOAD_TEST_TOKEN enables account notifications and advice search. High-volume runs verify the transition from anonymous 401 responses to rate-limited 429 responses. Separately test expensive routes with valid uploads and controlled latency.

Restore a database backup into a separate environment and verify private records and permissions through the application. A Neon snapshot rehearsal recovered four synthetic profiles and four notifications into a separate branch and verified the restricted role. Rehearse recovery of the hosted APIs and private files before approving public traffic.

Record the release build, target states/crops/languages, acceptable latency/error rate, spending ceiling, recovery time and operational owner. Exercise an alert, feature pause, rollback and independent restore. Review consequential agricultural outputs for the stated coverage. Handoff the two HTTPS origins to the frontend team and verify a physical-phone journey before inviting public users.
