# Backend engineering requirements

These instructions apply to backend/ and AiBackend/. Frontend implementation remains outside the current scope.

- Treat application code, actual provider contracts and executed tests as evidence. Read guide/ai_agent_rules.md and guide/testing.md for the requested review standard. Mark proposed features and unverified integrations explicitly.
- Apply the standard equally to existing and newly added handlers. Map every changed entry point, its callers, ownership checks, validation, storage, provider dependencies and failure paths.
- Use synthetic accounts and isolated data for tests. The owner has authorized a fresh database baseline. Shared deployments, real communications and paid provider runs still require their actual credentials and intended execution context.
- Validate external input and model output. Enforce ownership and staff decisions on the server. Never derive verification from a self-entered identifier. Keep keys, prompts, uploaded files and personal data out of logs.
- Keep work bounded. Specify timeouts, concurrency, retries, budgets and failure behavior. Make repeated and concurrent operations consistent. Preserve meaningful errors and avoid fake success.
- Reuse existing logic. Keep code readable and changes scoped to complete behaviours. Do not add speculative frameworks or placeholder integrations.
- Verify through real handlers and database operations. Keep deterministic tests independent of paid providers. Run npm test in backend/ and python -m pytest -q app in AiBackend/ when their related code changes.
- Keep the API handoff and release status accurate. A passing helper suite does not establish production readiness. Record any incomplete provider, database, deployment, restore, privacy or agricultural-review gate.

For developer setup, see [Development](docs/DEVELOPMENT.md). For release evidence, see [Release checklist](backend/RELEASE.md).
