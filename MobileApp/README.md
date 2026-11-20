# Nila Shoshsho app

Nila Shoshsho uses one React Native frontend for Android, iOS, and the PWA. Tarpon Refined 2 is the visual reference.

Sign-in is email and password. There is no phone login and no SMS. Paid API keys stay on the servers, never in this folder.

Root setup, keys, and leftover launch steps: [../README.md](../README.md) and [../ARCHITECTURE.md](../ARCHITECTURE.md). On Windows PowerShell use `npm.cmd` if `npm` is blocked.

## Talk to the servers

Native development defaults are configured in `backendConfig.js`.

- Account server default: http://10.0.2.2:5001/api (Android emulator)
- Advice server default: http://10.0.2.2:5002

The iOS simulator uses localhost. On a physical device, set `EXPO_PUBLIC_ACCOUNT_API_URL` and `EXPO_PUBLIC_ADVICE_API_URL` to addresses the device can reach. Set both variables to production HTTPS endpoints before packaging a release.

All calls go through utils/api.js. On **401**, the farmer is sent to login. On **422 / 502 / 503**, show the server sentence. Do not invent weather, mandi prices, schemes, or diseases.

## Run locally

Use Node.js 24 and install the locked packages with `npm ci`. Expo SDK 58 uses React Native 0.88, React 19.3, and React Native Web 0.21. The iOS target is 16.4 or later. Start the account server on port 5001 and the advice server on port 5002 before signing in.

```sh
cd MobileApp
npm ci
npm run android
```

iOS:

```sh
cd MobileApp
npm ci
npm run ios
```

## Develop the PWA

Run `npm ci` and `npm run web` from `MobileApp`. To call local services, set `EXPO_PUBLIC_ACCOUNT_API_URL=http://localhost:5001/api` and `EXPO_PUBLIC_ADVICE_API_URL=http://localhost:5002` before starting Expo. Direct browser access to another origin requires that service to allow the web app origin and its authenticated requests.

`npm run build:web` exports the static PWA to `dist/`. Its service worker precaches the app shell and excludes API traffic. For an offline smoke test, load it online, wait for the worker to install, switch offline, then reopen the app.

## Deploy the PWA to Vercel

Import the GitHub repo in Vercel and set the **Root Directory** to `MobileApp`. Select **Other** for the Framework Preset and **24.x** for Node.js. `vercel.mjs` sets `npm ci`, the web build, the `dist` output, the API rewrites and the cache headers.

Add these environment variables to **Preview** and **Production**, using a staging service for Preview if available. Apply changes with a new deployment.

| Variable | Example |
| --- | --- |
| `ACCOUNT_API_BASE_URL` | `https://account.example.com/api` |
| `ADVICE_API_BASE_URL` | `https://advice.example.com` |

Set HTTPS base URLs without credentials, query strings or fragments. Include the account server's `/api` prefix. Vercel forwards browser requests under `/api/` to the account API and `/advice/` to the advice API. The app uses same-origin paths on Vercel. Service tokens belong on the account and advice servers.

On the first preview, verify sign-in, a photo or PDF upload, Ask Nila recording and playback, and an offline reopen after installation. Test on iOS Safari and Android Chrome as well as desktop. The two backend services must be reachable over HTTPS from Vercel.

## What farmers can open

Home, Schemes, Crop Care, Market and News are the primary destinations. They use a bottom bar on phones and tablets and a navigation rail from 1024 logical pixels. Wider content can use two columns from 840 logical pixels.

Other screens from Home or Settings: Fertilize, Crop calendar, Water, Post harvest, Documents, Alerts, Jobs, Chat, Profile.

Home search uses the advice service's feature catalog and opens the matching tool in the app.

Ask Nila sends recorded speech to the advice server for transcription. Read-aloud uses `/voice/tts` with Expo Audio on Android and iOS and browser audio on the PWA.

The telephone callback pilot is visible only in builds with `EXPO_PUBLIC_VOICE_CALLBACK_PILOT=true`. Backend enablement and account enrollment are required before requesting a live call.

UI languages: English, Hindi, Marathi, Tamil, Bengali, Kannada, Telugu, Malayalam.

## UI pieces

Shared screen and input components live in `refined/ui.js`. See [the backend handoff](./REFINED_2_BACKEND_HANDOFF.md) for current contracts and migration decisions.
