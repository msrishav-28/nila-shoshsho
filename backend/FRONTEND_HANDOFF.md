# Frontend API handoff

Use the shared [app request helper](../MobileApp/utils/api.js). Web routes use `/api` and `/advice` with host rewrites. Native builds use explicit service URLs when connecting to hosted servers.

The account server controls session issuance, private files, plot ownership, staff decisions and carrier approval. Persist credentials through the session adapter and render permission failures without retrying them automatically. Leave private files in the server-controlled upload flow.

Advice results may be unavailable when a source rejects a key or is unreachable. Preserve source names and dates. Show uncertain crop results and the official scheme link where available. A scheme search gives information for the user to check with the official source.

See the [API contract](BACKEND_CONTRACT.md) and [acceptance checks](RELEASE.md).
