# Nila Shoshsho phone app

This is the farmer phone app (React Native 0.79). It is not a blank starter project.

Sign-in is email and password. There is no phone login and no SMS. Paid API keys stay on the servers, never in this folder.

Root setup, keys, and leftover launch steps: [../README.md](../README.md) and [../ARCHITECTURE.md](../ARCHITECTURE.md).

## Talk to the servers

Addresses live in ackendConfig.js (no secrets):

- Account server default: http://10.0.2.2:5001/api (Android emulator)
- Advice server default: http://10.0.2.2:5002

iOS simulator: use localhost. Physical phone: your computer LAN IP. Production: HTTPS only.

All calls go through utils/api.js. On **401**, the farmer is sent to login. On **422 / 502 / 503**, show the server sentence. Do not invent weather, mandi prices, schemes, or diseases.

## Run locally

Start both servers first (account on 5001, advice on 5002), then:

`sh
cd MobileApp
npm install
npx react-native run-android
`

iOS:

`sh
cd MobileApp
npm install
bundle exec pod install
npx react-native run-ios
`

## What farmers can open

Bottom tabs: Home, Scheme, Crop Care, Market, News.

Other screens from Home or Settings: Fertilize, Suggest / calendar, Water, Post harvest, Documents, Alerts, Jobs, Chat, Profile.

Home search jumps to a tool in this app. It is not a web search.

Listen uses POST /voice/tts and plays with expo-av. Speak uses Sarvam through the advice server.

UI languages: English, Hindi, Marathi, Tamil, Bengali, Kannada, Telugu, Malayalam.

## UI pieces

See [components/README.md](./components/README.md) for the components that are actually wired.
