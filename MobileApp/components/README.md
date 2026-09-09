# Phone UI pieces that are actually used

These components are wired in the live app. Do not add a second card or animation system.

- `Header.js` — screen title and back
- `BottomTabNavigator.js` — Home, Scheme, Crop Care, Market, News
- `SearchBar.js` — Home jump-to-tool search (`GET /search`)
- `VoiceSeed.js` — mic control above the tab bar (Sarvam)
- `VoicePlayer.js` — listen via `POST /voice/tts` and `expo-av`
- `EmptyState.js` — honest empty screens
- `StatusChip.js` — logistics job status
- `CustomToast.js` — toasts

Talk to servers only through `MobileApp/utils/api.js`. Visual tokens live in `theme.config.js`. Live wiring: [../../ARCHITECTURE.md](../../ARCHITECTURE.md).
