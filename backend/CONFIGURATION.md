# Backend configuration

Use the repository [.env.example](../.env.example) to prepare a private root `.env.local`. Both servers read it locally. Set hosted credentials through the hosting provider's private settings. Keep preview and production credentials scoped to their own environments.

| Capability | Configuration |
| --- | --- |
| Account records | PostgreSQL serving role via `DATABASE_URL`. Use `DATABASE_MIGRATION_URL` for approved schema setup. |
| Identity | Neon Auth base URL, signing-key endpoint, issuer, and audience. Staff identities come from `STAFF_USER_IDS`. |
| Private files | Cloudinary credentials and server-side government ID key. |
| Shared limits and cache | Upstash URL and token. Set a positive paid request budget for production. |
| Advice and voice | Enable only approved providers using the corresponding example settings. The callback pilot also requires an approved test recipient policy. |
| Market data and scheme search | `DATA_GOV_API_KEY` and `MYSCHEME_API_KEY` enable their respective lookups when the provider accepts the credentials. |
| Hosted access | Configure the allowed browser origins and any staging key on the servers. Keep credentials out of all `EXPO_PUBLIC_*` settings. |

Use the [release checklist](RELEASE.md) for synthetic checks before using shared services. DigiLocker and AgriStack require partner access and confirmed contracts. See the [roadmap](ROADMAP.md).
