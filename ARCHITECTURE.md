# Architecture

The native and web entry points load the same React Native screens in [App.js](MobileApp/App.js). Native builds store session tokens in platform secure storage. The browser keeps its token in session storage. The web service worker caches the interface and static files so the website can reopen offline. Account changes and fresh advice require a network connection.

```mermaid
flowchart TD
  S["Shared Refined 2 screens"] --> W["Vercel web beta"]
  S --> M["Android and iPhone builds"]
  W -->|/api| C["Render account service"]
  W -->|/advice| D["Render advice service"]
  M -->|Configured account URL| C
  M -->|Configured advice URL| D
  C --> N["Neon Auth and PostgreSQL"]
  C --> F["Private Cloudinary files"]
  D --> C
  C --> R["Upstash request limits"]
  D --> R
  D --> P["Configured advice and data providers"]
```

The account service handles sign-in, farmer profiles, plots, transport, notifications, private uploads, and staff review. The advice service verifies identity and calls the account service when it needs farmer context. Production permits public signup and login requests. Each service enforces permission on private requests and uses Upstash to bound traffic. Database and provider credentials stay on the servers.

The [database schema](backend/src/db/schema.sql) defines farmer profiles, plots, notifications, logistics jobs, account reviews and review events, pending uploads, account sessions, revoked tokens, and voice callbacks. Consult that file for constraints and relationships.

The [OpenAPI contract](backend/openapi.json) describes HTTP requests and responses. The [route inventory](backend/api-contract.json) maps the account and advice services. Use the running handlers and contract tests to resolve differences. Clients should handle permission failures explicitly and preserve source names and dates on advice results.

The [release guide](docs/DEPLOYMENT.md) maps the builds. [Development](docs/DEVELOPMENT.md) explains how to run the services.

## Sign-in request

```mermaid
sequenceDiagram
    participant App
    participant Account
    participant Identity as Neon Auth
    participant Database as PostgreSQL
    App->>Account: Email and password
    Account->>Identity: Verify credentials
    alt Verified
        Identity-->>Account: Identity and session
        Account->>Database: Load profile and save encrypted session
        Account-->>App: Account session and profile
    else Rejected or unavailable
        Account-->>App: Error for the sign-in form
    end
```

## Record ownership

```mermaid
erDiagram
    FARMERS ||--o{ FARM_PLOTS : owns
    FARMERS ||--o{ NOTIFICATIONS : receives
    FARMERS ||--o{ LOGISTICS_JOBS : creates
    FARMERS |o--o{ LOGISTICS_JOBS : accepts
    FARMERS ||--o{ ACCOUNT_REVIEWS : receives
    FARMERS ||--o{ ACCOUNT_REVIEW_EVENTS : concerns
    FARMERS ||--o{ PENDING_UPLOADS : submits
    FARMERS ||--o{ ACCOUNT_SESSIONS : starts
    FARMERS ||--o{ VOICE_CALLBACKS : requests
```
