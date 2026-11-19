# Backend implementation status

Current target is a hackathon/demo/portfolio backend with a production engineering standard and a path to public use. The owner authorized a fresh database baseline and asked that frontend implementation remain out of scope. Initial scope remains the existing product first.

## Original product

At original commit 22cef1b287ff the account service contained signup/login, logout, profiles, password changes, pictures, PDF uploads, notifications and transport jobs. The advice service contained farming chat, keyword feature search, weather, mandi prices and commentary, calendars, crop suggestions, fertilizer, irrigation, post-harvest advice, crop-photo assessment, schemes, news, stores, document explanation and Sarvam speech.

That source did not implement forecasting, satellite monitoring, plot records, Bolna calling, insurance submission or AgriStack. The guide plans describe proposals for those capabilities.

## Current phases

| Phase | Local implementation | Verification boundary |
| --- | --- | --- |
| Account and record safety | Fresh transactional SQL baseline, independent staff carrier/identity review and audit, immutable account role, versioned profile updates, token verification and revocation, atomic profile creation and welcome notification. | Live synthetic identity and account journeys through Neon. Render staging verified signup, sign-in, cross-service profile access and revocation. Hosted staff decisions need a separate rehearsal. |
| Private files | Decoded PDF and image validation, private PDFs, authenticated profile photos, five-minute signed viewing links and durable cleanup reservations. | Render staging verified upload, owner isolation, signed delivery and unsigned access rejection with synthetic files. Link expiry was verified against Cloudinary through local handlers. |
| Transport and notifications | Approval checks, atomic competing claims, repeatable actions, optional submission idempotency and serialized daily weather notifications. | SQL and handler journeys. Embedded PostgreSQL validates atomic statements but does not reproduce all production multi-connection scheduling. |
| Existing advice routes | Shared price normalization, honest source dates, current weather alignment, soil-unit fixes, structured crop-photo observations, request-correlated advice outcomes, partial-PDF disclosure and account-session enforcement. | Every advice endpoint exercised with signed identity and controlled providers. A live Gemini synthetic image returned a valid uncertain observation. Released regions still need agricultural evaluation. |
| Reliability and operating cost | Shared expiring request counters, daily request allowance, feature switches, bounded provider calls, weather/market/news caches, safe structured logs and private readiness commands. | Deterministic tests for failures and cache behavior. Actual Redis multi-worker operation, host metrics and monetary provider caps require configured accounts. |
| Delivery and handoff | Pinned dependencies, security fixes, JavaScript lint/format checks, Python static/format checks, OpenAPI validation, CI definition, non-root container definitions and frontend handoff. | GitHub Actions passed and both Linux containers started on protected Render staging. |

The user-facing fertilizer rate is deliberately unavailable until reviewed field guidance exists. The API returns rate_available=false and useful source/context information. Crop-photo confidence is a model score, and the endpoint permits uncertainty. Neither a working provider connection nor the listed geographic targets certify agricultural accuracy.

## Expansion backlog

- Future mandi forecasts need accessible historical data, ingestion, normalized market identity and rolling evaluation against simple baselines.
- Owner-scoped saved plots support list, create, edit and delete using an approximate center and farmer-entered crop details. Satellite monitoring still needs plot geometry, provider access and cloud/no-data handling.
- Spraying windows and proactive advisory need reviewed local rules, scheduling, leases and deduplication.
- Bolna's opt-in callback API is tested with controlled provider responses. The live account and dedicated pilot agent were verified. The pilot remains disabled until an enrolled recipient is available for a live test.
- BHASHINI fallback needs verified recognition/synthesis entitlement and evaluation.
- AgriStack and PMFBY need authorized provider access and verified consent/claim protocols.
- External alert delivery and production capacity require the chosen host and monitoring account.

These capabilities have no placeholder production endpoints.

## Remaining execution gates

The configuration check found Sarvam, Gemini, OpenAI and SerpAPI credentials present. Read-only live checks returned HTTP 200 for Gemini model access, OpenAI model access and the SerpAPI account. The standalone Sarvam SDK check synthesized one short Hindi greeting and validated its WAV structure. The 20 November 2026 Gemini smoke verified structured JSON and abstention on a synthetic image. Recognition, other languages, news retrieval and authenticated application voice journeys remain unverified.

Neon and managed Auth were provisioned with the additive schema, restricted runtime role, and verified identity settings in .env.local. Live synthetic signup, profile access, login, password change, logout and revoked-token rejection passed using the serving role. The advice API accepted a real Neon token and rejected it after logout. The Windows system resolver returned ENOTFOUND for the new Neon addresses. Verification used a process-specific public DNS resolution with the original hostnames and TLS verification intact. The Cloudinary delivery constraint was updated on the synthetic demo database and all four profiles were preserved. An app-scoped Upstash credential is configured locally. Both services passed live counter checks, and Python passed cache write and read checks. Perplexity and restricted government integrations remain optional access gates for their respective features. See CONFIGURATION.md for capability boundaries.

The 20 November 2026 recovery rehearsal restored a Neon snapshot into a separate temporary branch. The restricted serving role read all four synthetic profiles and four notifications and had neither schema creation privileges nor access to the Auth schema. The serving branch was unchanged. This establishes recovery of synthetic database records and privileges. Recovery of a deployed environment and private files still needs a hosted rehearsal.

Supported provider journeys, production-scale limits and load, alerts, recovery, and agricultural review remain open before public release. Official IMD warnings require approved access and a tested district mapping. Weather currently uses Open-Meteo. DigiLocker and API Setu sandbox responses use synthetic data and do not verify a user's real records.

See FRONTEND_HANDOFF.md for request/response expectations, RELEASE.md for execution and acceptance, and ROADMAP.md for the combined guide and 2027 plans.
