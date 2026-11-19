# Nila Shoshsho — Testing Runbook

Status: proposed engineering standard, not proof of passing tests.
Scope: backend/ and AiBackend/. Do not modify MobileApp/. API acceptance tests may exercise existing clients without changing them.

## 1. Truth and prerequisites

Earlier chat documents are proposals, not an implemented API contract. No feature, Redis deployment, insurance integration, or test result is established by these documents. Re-read the repository at the exact commit under test. Record commit, runtime versions, environment, commands, exit codes and reports. Never use production credentials or personal records.

Before running commands, inspect README, architecture/instruction files, manifests, lockfiles, environment examples, entrypoints, routes, database setup, auth helpers, existing tests, CI and deployment settings. Inventory every route with method, caller, permissions, validation, dependencies and tests. Inspect mobile API callers read-only to identify compatibility requirements. Mark uninspected areas UNKNOWN.

The previously inspected account package declared npm test and npm run loadtest. Reconfirm their definitions. Do not assume pytest, coverage plugins, type checkers, Redis, Docker services or linters are installed. Do not claim a health-check loop proves capacity, authentication, or complete integration. Do not run db:setup until its SQL is reviewed: previously inspected schema.sql contained a phone-number-clearing UPDATE.

## 2. Safe environments

Use disposable databases and synthetic users. Ordinary PostgreSQL can test SQL behavior but does not reproduce Neon Auth or every provider-specific behavior. Use a separately approved provider sandbox for those checks. Separate deterministic tests from opt-in, paid live-provider smoke tests. Prevent tests from falling back to production URLs. Require explicit environment identity before writes; fail when absent. Use narrowly scoped credentials, bounded spend and explicit cleanup. Never delete shared records as test cleanup.

## 3. Layered test strategy

Prefer many fast unit tests, focused integration tests and a small number of complete journeys. There is no mandatory 70/20/10 quota. Cover risks and invariants, not arbitrary counts.

- Unit: pure validation, prices/units, dates, ownership decisions, masking, normalization and deterministic model math.
- Component: real application handlers with controlled external HTTP responses and real parsing/serialization.
- Integration: real disposable database, concurrency constraints and Redis where adopted; identity sandbox separately.
- Contract: machine-readable request/response schemas checked against running handlers and existing client expectations.
- Journey: actual supported flows across both services using synthetic accounts.
- Live smoke: separately scheduled provider checks with strict timeouts, quotas and costs.

Mocks must sit at external boundaries, not bypass the authorization or business rule under test. Use sanitized provider fixtures with provenance and capture date. Include malformed, missing-field and changed-schema fixtures. Prove tests fail when the intended rule is deliberately broken in a disposable local branch. Never alter production for mutation or fault tests.

## 4. Route test matrix

Create one matrix row per actual route; do not copy guessed methods from earlier chat contracts.

For each route test: valid input; absent/expired/forged identity; wrong issuer/audience where applicable; user A accessing user B records; wrong role; missing/wrong-type/oversized fields; unknown IDs; bounded pagination; invalid JSON; unsupported content type; stable public error; sanitized diagnostic event; timeout; provider rejection; missing configuration. Verify unauthenticated sign-up, login, health and legitimate provider callbacks according to their actual protocol: do not require an existing login to create one.

### Account and stored data

- Sign-up/login/logout/password changes: inspect actual identity-provider semantics, duplicate accounts, expiry, revocation and partial failures.
- Profiles: ownership, allowlisted writable fields, no client-set verification or privileged role; dates, coordinates and encoded text boundaries.
- Uploads: actual decoded format, byte/pixel limits, decompression bombs, malicious filenames, EXIF handling, remote-storage failures and orphan cleanup.
- Notifications: owner-scoped lists and updates, pagination, UTC/local-day boundaries, duplicate scheduling.
- Logistics: permitted state transitions and roles; two simultaneous accepts must not both succeed; retry safety and transaction rollback.
- SQL/setup: fresh disposable install and repeated execution must preserve fixture records; inspect constraints, indexes, sensitive fields, rollback/forward-repair strategy and backup restoration.

### Advice and external data

- Chat: empty/huge/wrong-type inputs, irrelevant questions, prompt injection in user/provider/news text, unavailable facts, honest source timestamps, unsupported language and provider timeout.
- Crop photos: invalid bytes despite valid MIME, empty/large images, non-plant photos, uncertain output, malformed JSON, missing fields, NaN/out-of-range model scores and unsafe recommendations. A model-reported score is not calibrated diagnostic accuracy.
- Markets: same market names across districts/states, commodity/variety/grade/unit distinctions, mixed dates, missing/nonfinite/negative prices, stale feeds, pagination and source failures. Never turn provider failure into a valid empty result.
- Weather/calendar/soil/fertilizer/water/post-harvest: units, location ambiguity, crop/season relevance, stale data, missing soil-card readings, district/state differences, time zones, authoritative source provenance and safe abstention. SoilGrids is not a lab NPK test.
- News: source/date/location relevance, duplicate stories, stale stories, unsafe links, malicious article instructions, licensing, attribution, cache isolation and truthful summaries. News is not authoritative treatment or eligibility advice.
- Voice/translation: real supported languages and models, invalid audio, file duration/size limits, locale mismatch, unsupported fallback, audio-content type and timeout. Speech recognition and speech synthesis use different verified APIs.
- Schemes/insurance: official links, date/state/crop applicability, eligibility uncertainty and approved access. Do not test invented claim APIs or imply a claim was filed when only guidance was shown.

## 5. Future features: separate release gates

Forecasts: verify historical availability/licensing before implementation; daily snapshots cannot backfill missing years. Normalize market identity, dates and units; distinguish missing observations from zero. Use rolling time-based evaluation without leakage, compare against last-value and seasonal baselines, measure error per market/crop/horizon and empirical interval coverage. A fixed 14 observations is not proof of adequacy. Release only approved horizons/markets meeting documented thresholds; otherwise return insufficient evidence. Never invent confidence probabilities or causal explanations.

Satellite: require plot polygons or explicitly labeled approximate areas; test cloud masks, observation age, small/mixed pixels, seasons, no-data and access rights. NDVI change alone is not disease or moisture diagnosis.

Government integration: onboarding approval, permitted scopes, explicit consent, callback integrity/replay protection, withdrawal and deletion requirements. Never let clients edit verified land records. Severe disease alone must not trigger insurance filing or a universal 72-hour claim guarantee.

Jobs: retries with backoff/jitter, duplicate execution, locks/leases, crash recovery, dead-letter handling, idempotency and audit events. External actions require an approved, auditable authorization boundary.

## 6. Security and privacy verification

Map applicable OWASP ASVS controls to tests and evidence; choose level with a threat assessment, not a compliance claim. Test per-record authorization, mass assignment, injection, SSRF, upload abuse, CORS, trusted-proxy configuration, secret leakage and log redaction. Treat retrieved text as untrusted data. Scan source/history appropriately for secrets, dependencies for known vulnerabilities, and licenses for redistribution obligations. Findings require triage; a clean scan is not a security guarantee.

Rate limits: separate limiter namespaces, atomic concurrent increments, spoofed-token/header variation, verified user versus pre-auth IP policy, bounded key retention, all worker instances, provider outage and intentional degraded behavior. Preserve distinct sign-up/login windows; do not set every TTL to one minute. Return usable retry guidance where specified.

## 7. Performance and resilience

Set workload, dataset size, latency/error targets and spend budget before load tests. Exercise real authenticated reads/writes and expensive routes against controlled providers; do not load-test government or paid services without permission. Measure percentile latency, memory growth, connection pools, query counts and external cost. Test dependency timeouts, slow responses, malformed responses, retry amplification and restart recovery. Readiness should reflect critical dependencies; liveness should avoid restart loops caused by optional outages. Restore a backup into an isolated environment and verify records, permissions and application compatibility.

## 8. CI and release gates

Proposed gates require approval before changing CI or branch protection. First report existing baseline failures; do not hide them or demand an unreviewed rewrite.

1. Reproducible install from inspected lockfiles; format/lint/type checks configured for actual languages.
2. Secret, dependency and static security checks with documented triage.
3. Unit/component tests with no unexpected skips.
4. Disposable database/cache integration and API contract compatibility tests.
5. Coverage of critical branches; report uncovered changes. Coverage percentages are secondary evidence, not correctness.
6. Human-reviewed security/data changes and independent review of high-risk AI-generated code.
7. Approved staging smoke, migration rehearsal and rollback/forward-repair verification.
8. Release evidence: commit, test reports, known risks, owner, approved configuration and recovery instructions.

Do not require TypeScript migration of the current JavaScript backend as incidental cleanup. Add JSDoc/checking or typed boundaries incrementally where approved. Choose Python tooling after inspecting supported versions. Tool names in this guide are not assertions of installation.

## 9. Adding a regression test

Reproduce the user-visible failure with synthetic data. Write a test that fails for the broken rule. Change the smallest complete path. Verify the test passes and neighboring invalid/forbidden paths still fail safely. Search for twins of the same defect. Attach exact commands, status and sanitized evidence. If execution is unavailable, mark NOT RUN and name the blocker.

## 10. Use-wise acceptance and handoff

After automated gates, a tester uses an approved environment: create a synthetic account, sign in, update their profile, inspect prices and source dates, ask an advisory question, try a clear and unclear leaf photo, use supported voice languages, read news and recover from offline/provider failures. Test logistics using separate farmer/logistics accounts. Verify user A cannot see user B private data. Test proposed forecasts/insurance/satellite only once actually released.

Record expected/actual outcomes, environment, commit and sanitized screenshots or request IDs. Farmers should understand uncertainty and what to do next. Never show arbitrary raw backend/provider errors directly; map stable error codes to safe localized messages. Frontend layout/accessibility testing is a later separately scoped task.

## 11. Completion record

Report PASS / FAIL / NOT RUN for every gate; evidence location; residual risk and owner; what changed; what did not change; simple user checks; recovery procedure. No 'production-ready' claim from lint, coverage or a health endpoint alone.

## Reference

OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
Google layered testing guidance: https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html
References are reading pointers, not evidence that this application meets them.
