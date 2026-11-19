# Configure the backend

Edit only .env.local in the repository root. The root .env.example is the shareable template. Both services and maintenance commands find that same file regardless of the directory they start from. Restart running services after changing values. Hosting/process environment variables take precedence over this file.

## Start with one Sarvam call

Create a Sarvam account, open its API dashboard and generate an API subscription key. Paste it into SARVAM_API_KEY in .env.local. Check that the account has access and credits for the API. This is the only external credential needed for the standalone greeting check. From AiBackend, the virtual environment runs python sarvam_check.py and saves a successful Hindi WAV to a temporary file. [Sarvam quickstart](https://docs.sarvam.ai/api/getting-started/quickstart)

## Obtain these for the connected application

| Service | Values in .env.local | How to obtain them |
| --- | --- | --- |
| Neon database | DATABASE_URL, DATABASE_MIGRATION_URL | Configured locally for the new Singapore project. The serving connection uses a restricted application role. Keep the migration owner connection on the operator's machine. |
| Neon Auth | NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL | Configured locally for the same Neon branch and database. |
| Token validation | NEON_AUTH_ISSUER, NEON_AUTH_AUDIENCE | Configured locally and verified through signed Neon tokens. Both equal this deployment's Auth origin. |
| Cloudinary | CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET | Configured and verified locally with synthetic files. PDFs use private raw delivery and profile photos use authenticated image delivery. Expired links and unsigned photo variants were refused. |
| Gemini | GEMINI_API_KEY, GEMINI_MODEL | Create an API key for a project in Google AI Studio and verify its quota/access. Use gemini-3.1-flash-lite as the initial demo model value. Google documents text and image input for this model. It can power the current text-advice and crop-photo paths. Actual account access and agricultural output quality still need verification. |
| Government market feed | DATA_GOV_API_KEY | Register or sign in at data.gov.in and generate an API key in the account dashboard. Confirm access to the current AGMARKNET resource used by the backend. |
| SerpAPI news | SERP_API_KEY | Sign in to SerpAPI, open the API key page and copy the key. Check the account's available searches before enabling news traffic. Use the exact variable name SERP_API_KEY. |
| Upstash Redis | UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN | Configured in .env.local. Both backends use the project's Redis ACL token on the existing Free Upstash database. It permits the application's counter and cache operations on keys beginning with `nila:`. Use the scoped token in the hosts' secret settings. |

Official setup references are available for the database, Auth, storage, Gemini, government key and Redis. [Neon connection setup](https://neon.com/docs/connect/connect-from-any-app) · [Neon Auth](https://neon.com/docs/auth/overview) · [Neon JWT contract](https://neon.com/docs/auth/guides/plugins/jwt.md) · [Cloudinary configuration](https://cloudinary.com/documentation/cloudinary_sdks#configuration_parameters) · [Cloudinary private delivery](https://cloudinary.com/documentation/control_access_to_media) · [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key) · [Initial Gemini model](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) · [data.gov.in account and API keys](https://data.gov.in/help) · [SerpAPI key page](https://serpapi.com/manage-api-key) · [Upstash REST connection](https://upstash.com/docs/redis/howto/connect-with-upstash-redis)

## Optional provider access

Missing optional credentials do not need to delay local backend development. Use the following boundaries when selecting the demo scope.

| Capability | Minimum dependency | With the current local configuration |
| --- | --- | --- |
| Accounts, profiles, notifications and transport records | Neon database and Neon Auth | Neon is provisioned and synthetic account journeys passed. Windows system DNS failed to resolve the Neon endpoints during verification. The live test resolved them separately while retaining HTTPS verification. Advice routes also verify the account session. |
| Private profile pictures and documents | Cloudinary | Uploads unavailable until storage is configured. |
| Text advice | One configured text provider | Gemini and OpenAI have passed read-only model-access checks. Content generation remains a separate check. Missing Perplexity is skipped. |
| Crop-photo model analysis | Gemini | Model access confirmed. Live analysis with image input and agricultural accuracy remain unverified. |
| In-app voice | Sarvam | One Hindi greeting synthesis succeeded and its WAV structure was validated. Speech recognition and multilingual application journeys remain unverified. |
| News | SerpAPI | Account access confirmed; news retrieval remains a separate check. |
| Market prices | data.gov.in market feed | Unavailable without authorized feed access. No generated replacement prices. |
| IMD-specific weather and warnings | Approved IMD access, city station mapping and district warning IDs | Pending. The running API uses Open-Meteo. |
| Scheme API results | Verified myScheme access | Pending. Do not present generated scheme details as official API results. |
| Shared limits and caches across processes | Upstash | Live counters and cache operations verified from local Node and Python. Hosted latency, quotas and ingress behavior still need testing. |

The read-only checks on 19 November 2026 returned HTTP 200 for the configured Gemini model, OpenAI model and SerpAPI account. These checks did not generate model content or retrieve news. They establish access at that time, not complete feature readiness. No secret values were recorded. Repeat verification after changing credentials or provider accounts.

OPENAI_API_KEY enables the existing OpenAI text-advice provider. Create an API project key in the OpenAI developer dashboard and check its API billing and model access. PERPLEXITY_API_KEY enables the existing Perplexity text provider. Create an API key through the Perplexity API console and check its available API usage. Gemini alone can provide the current text and image model paths, so these are additional provider choices. [OpenAI key setup](https://developers.openai.com/api/docs/quickstart) · [Perplexity API setup](https://docs.perplexity.ai/docs/getting-started/quickstart)

MYSCHEME_API_KEY requires verified access. For IMD, request City Forecast Mapping (`cityforecast_mapping`), City Forecast with Latitude and Longitude (`cityforecastloc`), District Warning (`districtwarning`) and District Nowcast (`districtnowcast`) for national coverage and the supported initial states. The city endpoint accepts a station ID or returns station rows with coordinates. The district warning endpoint accepts a district ID. Validate those mappings and authenticated samples before enabling any IMD path. Maps, geocoding and mapped soils use public endpoints without a key in this configuration. Their availability and usage policies still apply. [IMD API reference](https://api.imd.gov.in/public/api_reference.html)

The Bolna callback pilot has a dedicated English-language support agent that identifies Nila Shoshsho, keeps calls short, and has no tools for account, insurance or farm-record changes. Its API key and agent ID are configured locally. BOLNA_FROM_PHONE_NUMBER optionally selects a number already configured on the Bolna account. Enroll a consenting test recipient in BOLNA_TEST_RECIPIENTS by binding their account UUID to a confirmed Indian mobile number. The server reuses that number for each user-requested call. Review Bolna recording and retention settings and the daily call limit before enabling BOLNA_CALLBACK_ENABLED in staging. Keep the public deployment disabled until a supervised test with an authorized recipient passes. [Bolna API quickstart](https://www.bolna.ai/docs/quickstarts/api)

`MET_FORECAST_ENABLED=true` lets the dashboard weather route use MET Norway for a labeled near-term forecast when Open-Meteo current data is unavailable. The server rounds coordinates to two decimals and identifies the project in its requests. It uses shared Redis to reserve a refresh for each rounded location for six hours and limit admission to four refreshes per second per environment. The fallback is unavailable when Redis is unavailable. [MET Norway weather API terms](https://api.met.no/doc/TermsOfService)

API Setu playground responses are synthetic and useful for evaluating response shapes. The public PMFBY catalogue lists a policy document API. Access to that sample cannot establish eligibility, premiums, claim status or access to live farmer records. A DigiLocker requester flow needs an approved application, the exact permitted document scope, a registered redirect and user consent. Keep sandbox work outside real farmer profiles until those conditions are met. [API Setu sandbox](https://sandbox.api-setu.in/) · [PMFBY API collection](https://directory.apisetu.gov.in/api-collection/pmfby) · [DigiLocker requester security](https://www.digilocker.gov.in/web/security-architecture)

## Values already prepared locally

- GOV_ID_KEY was generated locally and saved only in .env.local. It encrypts stored government identifiers. Keep it stable and retain it securely once records are stored.
- ACCOUNT_PORT and ADVICE_PORT default to 5001 and 5002. ACCOUNT_URL connects advice to accounts, and ADVICE_URL is used by the local load-test tool. Update their URLs if the ports or hosts change.
- NODE_ENV and FLASK_ENV are development for local work. FLASK_DEBUG is off. Use production for both environment settings on a public host.
- PAID_REQUESTS_PER_DAY starts at 50 for the demo. This is a shared request allowance, including admitted requests that later fail. Provider monetary ceilings and credits are separate settings in each provider account.
- STAFF_USER_IDS starts blank. After creating staff accounts through signup, add their user UUIDs as a comma-separated list. Staff can then approve carriers and review identity using the protected review endpoint.
- CORS_ORIGINS starts blank for local development. On a public host, provide the actual frontend HTTPS origins as a comma-separated list. TRUSTED_PROXY_CIDRS is for the host's verified proxy addresses.
- DISABLED_ADVICE_PATHS can hold exact comma-separated paths to pause paid features, for example /plant-disease.

## Share configuration safely

Keep keys in .env.local or hosting secret settings. Send only the names of configured services when asking for verification. The shared template remains blank for secret values and is safe to commit. Both service builds receive configured values through hosting environment variables or a root --env-file .env.local argument at launch. The local configuration is excluded from Git.

After the intended database has been initialized and Docker is available, the root command docker compose --env-file .env.local up --build starts both backends. Compose injects only the relevant variables into each service. The migration owner connection remains outside both serving containers. Container execution is still an unverified gate on this machine because Docker is unavailable.
