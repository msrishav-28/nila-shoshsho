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

Start both servers first (account on 5001, advice on 5002), then:

```sh
cd MobileApp
npm ci
npm run android
```

iOS:

```sh
cd MobileApp
npm ci
(cd ios && bundle exec pod install)
npm run ios
```

## Run and deploy the PWA

From this directory, run `npm ci`, then `npm run web` to develop with Expo Metro. For local API access, set `EXPO_PUBLIC_ACCOUNT_API_URL=http://localhost:5001/api` and `EXPO_PUBLIC_ADVICE_API_URL=http://localhost:5002` before starting the dev server.

Run `npm run build:web` and serve `dist/` from the root of an HTTPS origin. With the default API URLs, proxy `/api/*` to the account server, preserving the path. Proxy `/advice/*` to the advice server after removing `/advice` from the request path. Builds that use separate API origins can set the same two public URL variables at build time. Those origins must allow the PWA origin and its authenticated requests over CORS. Keep service credentials on the servers.

Serve `sw.js` with `Cache-Control: no-cache`. After one successful online visit, the service worker can supply the app shell and bundled assets offline. The service worker leaves API traffic with the browser. To verify a release on a device, install the PWA, switch the device offline, and reopen it after the first online load.

## What farmers can open

Home, Schemes, Crop Care, Market and News are the primary destinations. They use a bottom bar on phones and tablets and a navigation rail from 1024 logical pixels. Wider content can use two columns from 840 logical pixels.

Other screens from Home or Settings: Fertilize, Crop calendar, Water, Post harvest, Documents, Alerts, Jobs, Chat, Profile.

Home search jumps to a tool in this app. It is not a web search.

Listen uses POST /voice/tts and plays with expo-av. Speak uses Sarvam through the advice server.

UI languages: English, Hindi, Marathi, Tamil, Bengali, Kannada, Telugu, Malayalam.

## UI pieces

Shared screen and input components live in `refined/ui.js`. See [the backend handoff](./REFINED_2_BACKEND_HANDOFF.md) for current contracts and migration decisions.
