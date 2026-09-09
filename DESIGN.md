# Nila Shoshsho — Canonical DESIGN.md

> The soil's bounty, for your dedication.
> Framework-neutral design system for the Nila Shoshsho farmer companion.
> Hand this file to an AI agent. Do not invent tokens. Do not drift toward generic SaaS blue.

**Product:** AI-driven, voice-first, multilingual agricultural companion for Indian smallholder farmers.
**Platforms:** Bare React Native `MobileApp/` (iOS + Android), RN 0.79. Expo modules already in the app (`expo`, use `expo-av` for server TTS). Do not migrate to Expo Router.
**Languages (UI):** English, Hindi, Marathi, Tamil, Bengali, Kannada, Telugu, Malayalam.
**Codebase map:** `MobileApp/pages/*`, `MobileApp/components/*`, `MobileApp/theme.config.js`, `MobileApp/locales/*`, `MobileApp/utils/api.js`.

**Companion contract:** `FRONTEND.md` is the live HTTP contract (paths, bodies, status codes, auth). This file is visual + UX. If this file names an endpoint, payload, auth rule, or data shape that disagrees with `FRONTEND.md`, **FRONTEND.md wins**. Then patch *this* file before coding. Never put API keys in the app. Never invent weather, mandi prices, schemes, or pesticide doses when a call fails.

**Ancestry (steal patterns, never logos):**
| Concern | Reference system | What we take |
|---|---|---|
| Home shell, tabs, task-first CTAs | Uber + Swiggy | One job per screen, sticky location, fat primary action, India-native card density |
| Chat + mic | WhatsApp + ChatGPT | Familiar bubbles + structured agent answers (sources, next steps, chips) |
| Field / weather / place | AllTrails + Google Maps | Outdoor condition chips, map-sheet, glanceable forecast |
| Mandi prices | Cash App | Huge tabular numbers, green/red delta, one-screen worth |
| Season window | Google Calendar + Todoist | Month window + checkable field tasks later. Do not invent week-by-week calendars the server does not return |
| Leaf scan | Cal AI / Shazam | Full-bleed camera → result card |
| Schemes / reading | Apple Notes | Calm long-text, not card soup |

**Do not use as a system:** Instagram, TikTok, Discord, Netflix, Tinder, Spotify OLED, Linear-on-black.

---

## 0. Agent contract (read first)

You are restyling **Nila Shoshsho**, not inventing a new product.

1. Preserve all existing **React Navigation route names**, feature modules, and i18n keys. Visual labels may change; route strings (`Home`, `Scheme`, `Crop Care`, `Market`, `News`, …) stay until a wish asks otherwise.
2. Talk to servers only through `accountFetch` / `adviceFetch` in `MobileApp/utils/api.js`. URLs live in `MobileApp/backendConfig.js` (no secrets). Defaults: Android emulator `http://10.0.2.2:5001/api` and `http://10.0.2.2:5002`.
3. Auth is **Neon email/password** with a Bearer `accessToken` on the user object. There is no phone login and no phone field on the farmer. **No SMS. No OTP. No cookie JWT.**
4. Replace visual language using **only** tokens in this file. Prefer extending `theme.config.js` over scattering hex in pages.
5. Outdoor readability beats decoration. If glass and contrast fight, contrast wins.
6. Voice is a first-class mode. Listen = `POST /voice/tts` (Sarvam, play with `expo-av`). Speak = `POST /voice/stt`. Do not add a second TTS vendor. Do not keep `react-native-tts` as the product voice.
7. Indic scripts must never clip, wrap mid-akshara, or fall back to a Latin-only face.
8. Do not copy Swiggy orange, WhatsApp teal, Cash App green-on-black, or Uber black as the brand. Those are *layout* references.
9. Honor OS Reduce Motion. Animate meaning, not chrome.
10. WCAG AA minimum. Body text ≥ 16pt (prefer 17). Primary hit targets ≥ 48×48pt.
11. On **401**, log out and send the farmer to Login. On **422 / 502 / 503**, show the server sentence. Never fill gaps with demo data.
12. If a payload includes `source` and `asOf`, show them.
13. If a wish conflicts with a farmer in midday sun, the farmer wins.

---

## 1. Visual theme & atmosphere

Nila Shoshsho is **field-first counsel**. The interface should feel like standing at the edge of a plot at first light: warm paper, living green, harvest gold, a sky that carries weather — never a fintech dashboard, never a food-delivery feed, never a glassmorphism demo.

The canvas is a warm field paper (`#F4EFE4`), not cold Tailwind gray. This is soil/khadi paper on purpose, not a generic cream template. Surfaces are solid, slightly toothed, like sun-bleached notebook card. Type is large, weight-led, and bilingual. The one persistent signature is the **Voice Seed** — a circular mic control that sits above the tab bar like a seed in soil, ringed by a slow living pulse when listening.

Home is not a gallery of equal tiles. Home is a **Today brief**: who you are, where you stand, what the sky will do, what the mandi is doing to your crop, and the next action for this field. Chat is how advice arrives. Camera is how a leaf becomes a diagnosis. Market is a price, not a portal. Schemes are catalogue answers from myScheme, not a bundled JSON carousel.

Color is earth-bound and small. One brand green (`Paddy`), one harvest accent (`Turmeric`), one weather blue-slate (`Monsoon`). Semantic red is rust, not alarm-app crimson. Dark mode is dusk in the field (`#141A14`), used for night reading and OLED — never as a lifestyle skin. Default shipping mode is **light**.

Motion is agricultural: things *grow into place* (short spring, 12–20px rise) rather than bounce or blur. Stagger is 40–70ms. Duration 220–380ms. No 700ms entrance theater. No continuous parallax. The Voice Seed is the only element allowed a looping animation, and it must stop instantly on Reduce Motion.

**Key characteristics**
- Warm paper canvas `#F4EFE4` / dusk canvas `#141A14`
- Brand green **Paddy `#1F6B3A`** — growth, health, primary CTA
- Accent **Turmeric `#D4A017`** — attention, next action, voice listening ring
- Weather slate **Monsoon `#3E6D7A`** — forecast, location, water
- Solid cards, 16pt radius, 1pt hairline — **no frosted glass in sunlight**
- Persistent Voice Seed FAB (64pt) above tab bar on MainApp tabs
- Sticky plot/location header: village / taluk + crop chip when profile has them
- Condition chips (rain, irrigation due, price up/down) — AllTrails grammar
- Giant mandi price with tabular numerals — Cash App grammar. Unit **Rs/quintal**
- Chat: WhatsApp bubble chrome + ChatGPT structured answer blocks
- Camera scan: full-bleed viewfinder, one shutter, result sheet
- Indic-safe type stack (Noto Sans + Poppins Latin)
- Bottom tabs (route names unchanged): Home, Scheme, Crop Care, Market, News

**Name & voice**
- Wordmark: **Nila Shoshsho** (two lines allowed on brand moments; one line in chrome)
- Tagline: *The soil's bounty, for your dedication.*
- Tone of UI copy: plain, respectful, concrete. Prefer “Spray only after you ask KVK” over “Optimize your crop protection workflow.”
- Never address the farmer as a “user.” Address as a person with a field.
- Never invent a metric, a shop, a mandi row, or a pesticide brand.

---

## 2. Color palette & roles

### Brand
- **Paddy** `#1F6B3A` — primary brand, CTA fill, active tab, healthy crop, success-strong
- **Paddy Pressed** `#17532D`
- **Paddy Tint** `#1F6B3A1A` — 10% wash behind selected chips, voice idle ring
- **Paddy Soft** `#E5F0E8` — soft surfaces, success banners
- **Turmeric** `#D4A017` — accent, “next action”, listening state, unread, harvest
- **Turmeric Pressed** `#B38710`
- **Turmeric Tint** `#D4A01722`
- **Monsoon** `#3E6D7A` — weather, water, location pin, informational links
- **Monsoon Soft** `#E4EEF0`

### Canvas & surface — light (default, outdoor)
- **Canvas** `#F4EFE4` — app background (warm paper)
- **Surface** `#FFFBF3` — cards, sheets, inputs
- **Surface Recessed** `#EBE4D6` — wells, chip tracks, weather inner
- **Hairline** `#D7CFBF`
- **Overlay** `#1C191566` — 40% warm-black scrim over camera / sheets

### Canvas & surface — dark (dusk)
- **Canvas Dark** `#141A14`
- **Surface Dark** `#1C241C`
- **Surface Recessed Dark** `#243024`
- **Hairline Dark** `#2E3A2E`
- Default shipping mode is **light**. Dark follows system after tokens exist. Do not ship dark-only screens.

### Ink
- **Ink** `#1C1915` — primary text
- **Ink Soft** `#5C564C` — secondary
- **Ink Faint** `#8A8376` — tertiary, timestamps, tab inactive
- **Ink Inverse** `#FFFBF3` — text on Paddy / Turmeric / dark photo scrims

### Semantic
- **Healthy** `#1F6B3A` — aligned with Paddy
- **Watch** `#D4A017` — mild leaf health, price flat, irrigation soon
- **Alert** `#C4472A` — severe disease, price crash, failed request, 422 photo
- **Alert Soft** `#F8E6E1`
- **Info** `#3E6D7A` — aligned with Monsoon
- **Price Up** `#1F6B3A`
- **Price Down** `#C4472A`

### Forbidden (legacy — migrate off)
Do not introduce these in new work. Existing `theme.config.js` values to retire:
- `#2563EB`, `#1D4ED8`, `#3B82F6` (generic Tailwind blue as brand)
- `#10B981` as *the* green (too mint/SaaS; replace with Paddy)
- `#FAFBFC` cold gray canvas
- Emoji as the only weather iconography (allowed as fallback, not identity)
- `theme.darkBrown + '90'` glass slabs
- Random pastel feature-card fills (`#fffde7`, `#fce4ec`, `#e1f5fe` …)

### Roles summary

| Role | Light | Dark |
|---|---|---|
| Canvas | `#F4EFE4` | `#141A14` |
| Surface | `#FFFBF3` | `#1C241C` |
| Recessed | `#EBE4D6` | `#243024` |
| Hairline | `#D7CFBF` | `#2E3A2E` |
| Ink | `#1C1915` | `#F4EFE4` |
| Ink soft | `#5C564C` | `#B3AD9F` |
| Brand / CTA | `#1F6B3A` | `#3E9A58` (lifted for contrast on dusk) |
| Accent | `#D4A017` | `#E0B122` |
| Weather / info | `#3E6D7A` | `#7FA4AE` |
| Alert | `#C4472A` | `#E06A4F` |

### Contrast rules
- Ink on Canvas, Ink on Surface: AAA for body.
- Ink Inverse on Paddy: check ≥ 4.5:1. If a lighter Paddy is used on buttons, darken the fill, do not lighten the type.
- Turmeric is **not** a large-area text background. Use it as a ring, chip, or icon — not a paragraph field.
- Never put Ink Faint on Recessed for essential data (prices, disease names).

---

## 3. Typography rules

### Families
Nila speaks eight UI languages. Latin-only Poppins is insufficient as a solo face.

| Role | Face | Notes |
|---|---|---|
| Latin UI / display | **Poppins** (already bundled) | Weights 400 / 600 / 700 / 800. Keep existing files. |
| Latin alternate (if adding web) | Plus Jakarta Sans | Same metrics intent |
| Hindi, Marathi | **Noto Sans Devanagari** | 400 / 600 / 700 |
| Bengali | **Noto Sans Bengali** | |
| Tamil | **Noto Sans Tamil** | |
| Kannada | **Noto Sans Kannada** | |
| Telugu | **Noto Sans Telugu** | |
| Malayalam | **Noto Sans Malayalam** | |
| Numerals | Tabular lining on Poppins / Noto | Mandi prices, temps, quantities |

Load the Indic face that matches `i18n.language`. Never mix two display faces on one screen.

Spoken-language profile values may include Gujarati, Punjabi, Assamese (account server). Those are **profile tags**, not extra UI locales. Do not add UI packs for them.

### Hierarchy (pt at 1.0 Dynamic Type / default RN scale)

| Token | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| `display` | 40 | 800 | 1.10 | -0.8 | Brand moments only (Home footer wordmark) |
| `title` | 28 | 700 | 1.20 | -0.4 | Screen titles |
| `title-sm` | 22 | 700 | 1.25 | -0.2 | Sheet titles, section heads |
| `price` | 34 | 700 | 1.10 | -0.6 | Mandi modal price — tabular |
| `temp` | 44 | 700 | 1.00 | -1.0 | Current temperature |
| `body` | 17 | 400 | 1.45 | 0 | Reading, chat, scheme summaries |
| `body-strong` | 17 | 600 | 1.45 | 0 | Labels that are content |
| `callout` | 15 | 600 | 1.35 | 0 | Chips, list titles |
| `meta` | 13 | 400 | 1.35 | 0.1 | Timestamps, distance, source, asOf |
| `tab` | 11 | 600 | 1.00 | 0.2 | Tab labels — do not go below 11 |
| `button` | 16 | 700 | 1.00 | 0.2 | CTA labels. Sentence case, never ALL CAPS (Indic scripts have no case; Latin must match) |

### Principles
- **Sentence case** on buttons and titles. ALL CAPS is hostile to Indic localization and to literacy.
- Weight, not color, creates hierarchy.
- Body never below 16pt. Prefer 17.
- Line length on scheme reading: max ~40 characters for Indic, ~60 for English.
- Truncation: 2 lines max on cards; never truncate a disease name or a price.
- Avoid `width * 0.0x` font scaling from `theme.config.js` (`fs0`–`fs7`). It explodes type on tablets and shrinks it on small Androids. Use the fixed scale above + system font scale.
- No italic display headings. Indic emphasis is weight, not italic.

---

## 4. Layout, spacing, depth

### Grid
- Screen gutter: **20pt**
- Card inner padding: **16pt**
- Stack gap (related): **8pt**
- Stack gap (section): **24pt**
- Section to section: **32pt**
- Max content width on tablet: 720pt, centered
- Bottom safe area: tab bar 64pt + Voice Seed overlap 28pt + device inset

### Radius
- **Sheet / card** 16
- **Button / input** 14
- **Chip** 999
- **Voice Seed / avatar** 999
- **Image thumb** 12
- Do not use 6pt squircles for primary controls (legacy `r3`)

### Elevation (replace blur)
| Level | Treatment |
|---|---|
| 0 | Flat on canvas |
| 1 | Card: hairline + shadow `0 1 2 0 #1C191514` |
| 2 | Raised button / seed: `0 4 12 0 #1C19151F` |
| 3 | Modal sheet: `0 -8 32 0 #1C191529` |
| Scrim | Overlay `#1C191566` |

**Glassmorphism is retired** as a default. `GlassmorphicCard` may remain in code as a compatibility wrapper that now renders a Level-1 solid Surface card. Blur is allowed only over a live camera preview.

### Layout habits (the visual signature)
1. **Top:** sticky identity row — greeting or back, location, language, profile avatar.
2. **Hero fact:** one oversized number or status (temp, price, leaf health).
3. **Condition chips:** horizontal, 8pt gap.
4. **Next action:** full-width Paddy button or Turmeric ghost for secondary.
5. **Supporting list.**
6. **Voice Seed** floats; tab bar is quiet paper.

Do not center-stack everything. Left-align type. Center only the Voice Seed, shutter, and empty-state illustration.

---

## 5. Motion & interaction

| Token | Value |
|---|---|
| `ease-out` | cubic-bezier(0.16, 1, 0.3, 1) |
| `spring` | damping 18, stiffness 220 (Reanimated) |
| `fast` | 180ms |
| `base` | 260ms |
| `slow` | 380ms |
| `stagger` | 50ms per item, cap 6 items |
| `press-scale` | 0.97 |

**Allowed**
- Screen enter: fade + 16pt translateY, 260ms ease-out
- Cards in a row: stagger 50ms, max 300ms total
- Button press: scale 0.97 + color to Pressed
- Sheet present: 380ms spring from bottom
- Voice Seed listening: 2.4s opacity/scale pulse on the Turmeric ring only
- Chat bubbles: appear 180ms, no bounce
- Price delta: numeral ticks 200ms, color snap

**Forbidden**
- Layout animation on weather rebuilds
- Blur-in, glitter, gradient-shift loops
- 600–800ms page intros (current `AnimatedFadeInView` defaults)
- Horizontal feature carousels as the *only* way to reach a tool
- Auto-playing decorative Lottie on Home

**Reduce Motion:** all translate/scale become 120ms fades. Voice Seed ring becomes a static Turmeric stroke.

Haptics: light impact on tab change; medium on shutter; success on diagnosis received; warning on 422 / severe leaf health.

---

## 6. Components

### 6.1 Buttons
- **Primary.** Fill Paddy, text Ink Inverse, height 52, radius 14, label `button`. Full width in forms and empty states. Min width 160 in toolbars.
- **Secondary.** Surface, 1.5pt Paddy hairline, text Paddy, height 52.
- **Ghost.** No fill, text Paddy, height 44.
- **Destructive.** Alert fill, Ink Inverse — or Alert text on Settings logout (no fill).
- **Voice.** 64 circular, Paddy fill, white mic glyph. Listening: Turmeric ring 3pt.
- Disabled: 40% opacity, no press scale.
- Do not put two primary buttons on one screen. One Paddy, then Secondary.

### 6.2 Voice Seed (signature)
- Diameter 64, sits 12pt above tab bar, optically centered.
- Idle: Paddy fill, white mic, Level-2 shadow.
- Listening: Turmeric 3pt ring + pulse. Audio posts to `POST /voice/stt` (multipart field `audio`, optional `lang`). Transcript can fill Search or go to Chatbot.
- Speaking (TTS): Monsoon ring, speaker glyph, playing `audio_base64` from `POST /voice/tts`.
- Long-press: language hint toast (“Listening in हिन्दी”).
- Always visible on MainApp tabs. Hidden on camera shutter if it collides — then a 44pt mic lives in the header.
- On 503/502 from Sarvam: toast the server sentence. Do not fall back to device TTS.

### 6.3 Inputs
- Height 52, Surface fill, 1pt Hairline, radius 14, 16pt inner.
- Focus: 2pt Paddy ring, no glow.
- Error: 2pt Alert, helper text 13/400 Alert below, 6pt gap.
- Search: leading magnifying glyph Ink Soft; trailing mic glyph. Placeholder “Ask Nila or search…”. Tap mic to start Sarvam listen, tap again to stop. Submits `GET /search?q=` and navigates to `results[].route`. Empty `q` returns the full catalog. Show the server sentence if listen fails.

### 6.4 Chips
- Height 32, padding 12 horizontal, radius 999, Recessed fill, callout 15/600.
- Selected: Paddy Tint + Paddy text + 1pt Paddy.
- Weather chips: icon 16 + label.
- Price chips: up = Paddy Soft / Paddy; down = Alert Soft / Alert. Always include `▲` / `▼` plus color.

### 6.5 Cards
- Surface, radius 16, Level-1, padding 16.
- Media 16:10 on the top edge, radius inherited, no extra inset.
- Title `title-sm` or `callout`, meta row, optional chip, optional primary text button.
- Do not nest cards in cards.
- Do not use a different pastel per feature. Use one Surface and a 40pt monochrome glyph in Paddy / Monsoon / Turmeric.

### 6.6 Header
Replace the current stacked Header (`components/Header.js`).
- Height 52 + status inset.
- Leading: 44 circular back on Recessed (not dark-brown pill).
- Title: `title-sm`, one line, start-aligned after back.
- Trailing: optional language “अ आ” glyph and Listen (TTS).

### 6.7 Tab bar
- **Route names (locked):** `Home` · `Scheme` · `Crop Care` · `Market` · `News`
- Visual labels (i18n): Home, Schemes, Care, Market, News
- Height 64 + home indicator.
- Surface / paper, Hairline top.
- Active: Paddy glyph + label. Inactive: Ink Faint.
- Do not rename routes to `You` or fold News out of the tab bar until a wish asks. Profile stays a stack screen from the Home avatar / Settings.
- Icons: custom 24pt stroke set, 2pt stroke, rounded caps. Do not mix Entypo + Ionicons + PNGs on one bar.
- Voice Seed is chrome above this bar, not a sixth tab.

### 6.8 Chat
WhatsApp geometry, ChatGPT intelligence. Wired to `POST /chatbot/ask` `{ question, lang, has_image }`.
- Canvas behind thread: Canvas (not WhatsApp wallpaper).
- User bubble: Paddy, Ink Inverse, radius 18, tail lower-right, max width 78%.
- Assistant bubble: Surface, Ink, radius 18, tail lower-left, Level-1. Body is `answer`.
- Footer meta: `model` as faint text only if useful; always show `sources[]` (`source`, `asOf`) as chips when present.
- Composer: Surface bar, 44 height field, Voice Seed-mini 40 → STT → fills composer.
- Suggested prompts as chips above composer on empty state (Schemes, Care, Market). Chips are *suggestions*, not the whole product.
- Markdown allowed in assistant only.
- 502/503: Alert Soft bubble with the server `error`. Do not type a fake advisory.

### 6.9 Diagnosis result (Care)
`POST /plant-disease` multipart field `image`, optional form `lang`. JPEG/PNG, max 6 MB.
- Hero photo 16:9, rounded 16.
- Name `title-sm` = `disease`. Plant as meta. Confidence as meta (`47%` tabular), never as a fake precision story.
- Leaf health only (`leaf_health`). One health meter: 8pt track Recessed, fill semantic, radius 999. There is no `plant_health` field anymore.
- Treatment body is the server `treatment_procedure` (always “ask KVK”, not a spray recipe). Do not add brand names on the phone.
- Source chip: `Gemini vision`.
- **422:** Alert sheet “Not sure from this photo. Ask your KVK.” plus confidence. Do not guess a disease.
- **503/413/502:** server sentence.
- Primary: “See fertilizer” (navigates). Secondary: “Ask Nila”.

### 6.10 Price row (Market)
- Crop name callout, market / district meta, modal price `price` tabular + `Rs/quintal`, min/max as meta.
- Show `source` and `asOf` (arrival date).
- Empty records: honest empty, not sample wheat at 2300.
- Nearby stores: list from `GET /stores/nearby`. Use `mapsUrl` and `telUrl`. Do not invent shops on 502.

### 6.11 Scheme results
`POST /govscheme` `{ query }` returns `{ query, schemes, source, link }`.
- `schemes` is the myScheme payload. Render titles and links from it. Do not add a bundled schemes file as truth.
- **503:** show `error` and a Primary that opens `link` (`https://www.myscheme.gov.in`).
- Listen reads a short spoken list of titles via `/voice/tts`, never invented subsidy amounts.
- Chat geometry on the Schemes tab (composer + thread). Optional later “Browse” segment. Do not delete the ask composer.

### 6.12 Weather brief
`GET /weather?lat=&lon=` (advice server, Bearer). Do not call Open-Meteo from the phone.
- Location row with Monsoon pin (profile city/state, or “Set location” if lat/lon are 0).
- Temp `temp` from `open_meteo.current.temperature` + humidity / wind meta.
- If `imd` is present, a Monsoon chip with `today_forecast` / station. If `imd` is null, omit it. Fail only on 502 (both feeds missing).
- 7-day from `open_meteo.daily`: `dates`, `temp_max`, `temp_min`, `precipitation`. Map rain from precipitation, not WMO weathercodes. Icon 24 + emoji fallback.
- If precipitation in the next two daily slots is meaningful, Watch chip: “Rain likely — delay spray.” (copy only; not a dose).
- Show `source` / `asOf` when present.

### 6.13 Toasts
Keep `CustomToast`. Colors: Paddy Soft / Alert Soft / Monsoon Soft. Text Ink. Radius 14. Bottom above Voice Seed, never covering it.

### 6.14 Empty / loading / offline
- Loading: Paddy 2pt spinner, no full-screen white flash. Skeleton bars on Surface, 12pt radius, 1.2s shimmer (disabled if Reduce Motion).
- Empty: 120pt line illustration (crop / basket / cloud), body 17, one Primary.
- Offline: sticky **top** banner Monsoon fill, Ink Inverse, 36pt tall — not a bottom `position: 'fixed'` blue bar (`App.js` OfflineBanner). RN has no `position: 'fixed'`.

### 6.15 Error banners
Map HTTP to UI (same visual: Alert Soft card, body 17, optional link):
- 400 invalid input
- 401 log out
- 403 logistics-only
- 404 not found
- 409 email or phone already registered
- 413 file too large
- 422 plant photo not confident
- 429 wait, retry once
- 502 upstream down (weather, mandi, AI, OSM, IMD)
- 503 feature not configured (missing server key)

---

## 7. Screens (mapped to existing files)

Implement these layouts. Do not add routes unless a wish asks. Logistics is the one missing screen FRONTEND.md already requires; add it as a stack screen when implementing that wish, not as a sixth tab.

### Welcome — `pages/Welcome.js`
Full-bleed field photograph (real Indian farm, dawn, no stock handshake). Bottom sheet Surface ~40% height: wordmark, one-line promise in **current i18n language**, Primary “Create account”, Ghost “I already have an account”, language switcher (all 8). Kill the four generic iconettes and the English-only body. “Made in India” stays as meta, not a hero.

### Login — `pages/Login.js`
Email and password only. Show/hide password, Primary “Log in”, link to Signup. On success: save `user` + `user.accessToken`, `navigation.reset` to MainApp. **No phone field. No OTP.** All copy through i18n.

### Signup — `pages/Signup.js`
Username, email, password + show/hide, role dropdown (Farmer | Logistics), gender dropdown. One Primary. No phone field. Role is a real product fork; Logistics keeps the same shell with a jobs entry from Settings until a dedicated Home variant is wished. Do not invent a second app now.

### Home — `pages/Home.js`
1. Identity: greeting + `{first name}` + plot location (or “Add village” if lat/lon are 0). Avatar → Profile. Bell → Notifications. Language. Settings.
2. SearchBar → `GET /search?q=` → navigate to `route`. One-line caption: jump-to-tool, not web search.
3. Weather brief from `GET /weather`.
4. Today action card — derived only from live weather/notifications (e.g. heat/cold/wind from `POST /api/notifications/weather-check`). If none, omit the card. Do not invent irrigation tasks.
5. Tools grid **2×3** (seven tiles wrap), not a horizontal FlatList of 7 pastels. Destinations stay: PostHarvest, WaterManagement, Crop Care, Fertilizers, Market, Scheme, News.
6. Mandi snapshot: one crop from `GET /api/market-prices` using profile state. Cash App number + source/asOf. Empty if 503/no rows.
7. Ask Nila — field lookalike that opens Chatbot + focuses composer. Mic starts Voice Seed STT.
8. Schemes teaser: **one** card “Ask about a scheme” → Scheme tab. Do not carousel a bundled schemes file.
9. Wordmark moment only after content, smaller than the current 60pt double stack, or drop it.
10. On focus: optional `POST /api/notifications/weather-check` if location exists; do not fake local alerts.

### Care — `pages/Cropcare.js` + stack links to Fertilizers, WaterManagement, CropSuggestion
Default landing: shutter. Gallery as secondary. After image: diagnosis sheet (§6.9). Optional segmented: Scan · Feed · Water · Suggest (Feed/Water/Suggest may push the existing stack screens). Fix camera `mediaType` (code currently has `mediaTypeetten`).

### Market — `pages/Market/Market.js` + `MarketPrices.js` + `NearbyStores.js`
Keep two segments: Current Prices | Nearby Stores. Retire the green full-bleed header — paper canvas like Home.
- Prices: `GET /api/market-prices?state&district&commodity&offset&limit`. Tabular rows. After the first successful fetch, state/district/crop dropdowns come from those live records (plus All); typed lists are first-paint fallback only. Analysis via `POST /api/market-analysis` only on the **visible live rows**, labelled “comment on these live rows only”, with `source`/`asOf`. No invented two-week forecast.
- Stores: `GET /stores/nearby?lat&lon&state`.
- Compare and Insights stay as Market tabs. Insights is labelled “comment on these live rows only” and shows `source`/`asOf`.

### Schemes — `pages/Schemes.js`
Scheme-advisor **ask** against `POST /govscheme`. Header “Schemes” → thread → composer “Ask about a scheme…” → results as title/link cards from `schemes` + Voice Listen on titles. Suggested chips: “PM-KISAN”, “PMFBY”, “drip subsidy in my state”. Empty state is the bot greeting. 503: open myScheme.

### Documents — `pages/Documents.js`
Two segments: **My docs** | **Translate**.
- My docs: `POST /api/upload/upload-doc` Bearer, field **`document`**, PDF only, max 10 MB. List `user.documents`. Reject non-PDF.
- Translate: pick PDF → Primary “Explain in {current language}” → `POST /translate` field **`file`** + `target_language` → Notes-like reading of `translated_document` + Listen. This is an explanation, not a certified translation. Do not invent subsidy amounts if it fails.

### Fertilizers — `pages/Fertilizers.js`
Form: crop name, optional Soil Health Card number fields, and a link to soilhealth.dac.gov.in so the farmer can copy numbers. Primary “Get recommendations” → `POST /api/fertilizer_recommendation` `{ crop, lat, lon, lang, region, soil_health_card? }`. Result: always show `soil_source` (card vs map soil), then `recommendation` as sectioned prose, optional nutrient table parsed from markdown. No brand or cost language. Weather object as a small brief. Error + loading on the button. If lat/lon are 0, ask the farmer to save location first.

### Water — `pages/WaterManagement.js`
Form: crop, field size (acres, tabular), irrigation method chips (Drip / Sprinkler / Surface / Subsurface / Manual). Soil type input (do not silently default to a fake lab class). Submit → `POST /water_management`. Result: **one advice block** + weather object + Voice Listen. One-line “weather plus advice, not a sensor”. Do not invent a day-by-day lab schedule if the server did not send one. Method chips: selected = Paddy fill.

### Crop suggestion + calendar — `pages/CropSuggestion.js`
Segmented: **Suggest** | **Calendar**.
- Suggest: lat/lon (profile), acres → `POST /crop_suggestion`. Show `season` (Kharif | Rabi | Zaid), `windows[]` (crop, sow_months, harvest_months, source), weather, `source`. Not a ranked “AI score” table. Per-row “Make calendar” fills the Calendar segment.
- Calendar: crop → `POST /crop_calendar`. Show official month window + 7-day weather overlay. **404:** “No official sowing window for that crop.” Do not invent weeks. Known crops are server-side (Paddy, Maize, Soybean, Cotton, Groundnut, Wheat, Mustard, Chickpea, Onion, Moong, Watermelon).

### Post-harvest — `pages/PostHarvest.js`
Form: crop, harvest date (modal date picker, 52pt field, not typed ISO), region (prefill `user.location.state`). Submit → `POST /postharvest`. Result: `advice` + weather + Listen. One-line “weather plus advice, not a sensor”. **There is no Google Calendar sync.** Do not show a fake sync affordance.

### News — `pages/News.js`
Still a tab (route `News`). Cards: 16:10 thumb, date meta, title 2 lines, snippet 3 lines, source icon + name. Filters: search, category chips (`all | crops | weather | market | technology | government`), state (`all` or FRONTEND.md list). `GET /news?category&state&search&lang`. Pull-to-refresh. Tap `Linking` to item link. **503** if SerpAPI is not on the server. Empty list is valid. No SerpAPI key in the app.

### Notifications — `pages/Notifications.js`
No longer a blank page.
- `GET /api/notifications` → rows `{ notification_id, title, body, is_read, created_at }`. Unread Paddy dot. Tap `PUT /api/notifications/:id/read`.
- On open, if profile lat/lon exist: `POST /api/notifications/weather-check`. Kinds `heat | cold | wind | update`. **400** if no location: empty state “Add your village to get weather alerts.”
- Empty: illustration “No alerts yet”, body “Weather warnings will land here.” No fake items.

### Profile — `pages/Profile.js`
Read-only identity. Avatar 96, labeled rows from the user object (FRONTEND.md). Verification chip from `isVerified` (true only when government-ID name and number are saved). Trailing “Edit” → UpdateProfile. Do not restyle as a second Settings.

### Update profile — `pages/UpdateProfile.js`
Long form on paper. Existing fields. One pinned Primary “Save profile”. Group: Photo · Person · Place (lat/lon matter) · IDs · Social. `PUT /api/auth/update-profile` and `PUT /api/auth/update-profile-pic`. Social URLs optional and visually secondary.

### Settings — `pages/Settings.js`
Header. Profile-completion ring (`GET /api/auth/profile-completion`, tint Paddy) + one-line prompt. Rows (52pt): Edit profile, Documents, Language, Password, Notifications, **Jobs** (Logistics list — Farmer creates, Logistics role accepts). Destructive last: Log out (`POST /api/auth/logout` then clear storage). Surface grouped list, radius 16.

### Language — `pages/LanguageChange.js`
Vertical radio list of **all 8** shipped UI locales with endonyms (the current picker lists 4 — product bug). Spoken-languages from profile as a subtitle group. Primary “Use this language”. Huge hit targets.

### Password — `pages/PasswordChange.js`
**One screen, three fields:** current password, new password, confirm. `PUT /api/auth/update-password` `{ currentPassword, newPassword }`. No phone confirm, no OTP, no SMS. Primary “Update password”. Copy through i18n (today it is English-hardcoded).

### Chatbot — `pages/Chatbot.js`
Replace the menu-of-links bot with §6.8 thread. `POST /chatbot/ask`. Keep quick chips as suggestions. Honest error bubbles. Do not call deleted CrewAI `/advisory/ask`.

### Logistics — new stack screen (FRONTEND.md requires it; no file yet)
Do not add a tab. Reach from Settings → Jobs.
- Farmer: create `{ crop, quantityKg, pickupCity, pickupState }`, list own jobs, cancel while OPEN.
- Logistics role: list OPEN + accepted, accept, mark done.
- Status chips: OPEN / ACCEPTED / DONE / CANCELED.
- 403: “This action is for logistics partners.”
- Spec this empty/list UI when the screen is added. Until then, do not invent it during an unrelated restyle.

---

## 8. Voice & multilingual UX

- Default language = device locale if it is one of the 8 UI langs, else English (i18n fallback today). Hindi-first is allowed later if a wish asks; do not silently override a saved `appLanguageValue`.
- Every result card that is more than two sentences gets Listen → `POST /voice/tts` `{ text, lang }` → play `audio_base64` with `expo-av`.
- Voice Seed STT → `POST /voice/stt` multipart `audio`.
- Speech `lang` must match `i18n.language` (english, hindi, hi, en-IN, … as FRONTEND.md).
- Do not put English microcopy in non-English builds. All eight UI packs (`en,hi,mr,ta,bn,kn,te,ml`) must follow the English key tree. All strings through `locales/*.json`.
- Minimum type size still applies to Tamil/Malayalam (taller glyphs). Add 2pt extra line-height for those locales.
- Avoid italics for emphasis in Indic text; use weight.
- `VoicePlayer.js` is restyled to this pipeline. Device `react-native-tts` is legacy.

---

## 9. Iconography & imagery

- Stroke icons, 2pt, 24pt optical, rounded joins. One family only.
- Photography: real plots, hands, produce, mandi corridors. Warm, documentary, no luxury-farm stock, no neon grading.
- Illustrations: single-weight line + one Paddy fill. Used for empty states only.
- Do not use emoji as brand marks. Weather emoji is a fallback when the icon set is missing a condition.
- Logo: redraw as a simple seed/leaf monogram in Paddy on paper. Current `logo.jpg` should not sit as a 180pt photo-logo on Welcome.

---

## 10. Responsive behavior

- Android 360×640 is the primary design surface (the farmer’s phone).
- iPhone SE / 375 is the iOS floor.
- Tablets: 2-column Home (brief | tools), reader gets generous margins.
- Landscape camera: shutter still thumb-reachable.
- Split text / controls so a 200% font scale does not hide Primary behind the fold — pin Primary above the tab bar.
- Status bar: dark-content on paper, light-content on camera / dusk.
- Use `SafeAreaView` / `useSafeAreaInsets`. Do not guess `StatusBar.currentHeight` as the only inset.

---

## 11. Accessibility

- WCAG AA. Prefer AAA for body on paper.
- All controls `accessibilityRole` + vernacular `accessibilityLabel`.
- Focus order: header → hero fact → primary action → list → seed → tabs.
- Contrast on Turmeric text is illegal; Turmeric is decorative/accent only.
- Don't rely on color for price up/down — include `▲ 12` / `▼ 8` plus color.
- Touch: 48pt min. Tab glyphs currently 23pt with 11pt labels — increase hit slop to fill the 64pt bar.
- Screen reader announces diagnosis status before advice. Announce 422 before retry.
- Captions/transcripts: STT transcript is visible in the composer; TTS has a visible Listen/Stop.

---

## 12. Do / Don't

**Do**
- One Primary per screen
- Solid paper cards
- Tabular prices in Rs/quintal
- Voice Seed always at hand on main tabs
- Left-aligned vernacular type
- Map tokens into `theme.config.js`
- Show `source` and `asOf`
- Use `accountFetch` / `adviceFetch`

**Don't**
- Tailwind blue brand
- Glass cards over photos of fields
- Horizontal-only tool access
- ALL CAPS English CTAs
- Fake AI sparkle gradients
- Five accent colors on Home
- Nested `NavigationContainer` (Market.js)
- `position: 'fixed'` in RN
- Emoji weather as the identity
- Dark-brown circular back button at 0.7 opacity (`Header.js`)
- SerpAPI / Groq / Gemini / Sarvam / data.gov keys in the app
- Cookie sessions, SMS OTP, demo mandi rows
- Google Calendar sync chrome
- Bundled `schemes.json` as live schemes
- Spray recipes or pesticide brands
- CrewAI `/advisory/ask` (gone). Use `/chatbot/ask`

---

## 13. Token implementation (React Native)

Replace `MobileApp/theme.config.js` conceptually with:

```js
export const color = {
  paddy: '#1F6B3A',
  paddyPressed: '#17532D',
  paddyTint: '#1F6B3A1A',
  paddySoft: '#E5F0E8',
  turmeric: '#D4A017',
  turmericPressed: '#B38710',
  monsoon: '#3E6D7A',
  monsoonSoft: '#E4EEF0',
  canvas: '#F4EFE4',
  surface: '#FFFBF3',
  recessed: '#EBE4D6',
  hairline: '#D7CFBF',
  ink: '#1C1915',
  inkSoft: '#5C564C',
  inkFaint: '#8A8376',
  inkInverse: '#FFFBF3',
  alert: '#C4472A',
  alertSoft: '#F8E6E1',
};

export const space = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 48: 48, 64: 64 };
export const radius = { sm: 12, md: 14, lg: 16, pill: 999 };
export const type = {
  title: { fontSize: 28, fontFamily: 'Poppins-Bold', lineHeight: 34 },
  body:  { fontSize: 17, fontFamily: 'Poppins-Regular', lineHeight: 25 },
  price: { fontSize: 34, fontFamily: 'Poppins-Bold', fontVariant: ['tabular-nums'] },
  // swap fontFamily from a script map when i18n.language !== 'en'
};
```

Keep legacy keys (`theme.primary`, `theme.secondary`) as aliases during migration:
- `primary` → paddy
- `secondary` → paddy (not mint)
- `accent` → turmeric
- `bg` → canvas
- `card` → surface
- `text` → ink
- `blue` → monsoon

Libraries already in `package.json` to lean on: `react-native-reanimated`, `react-native-svg`, `react-native-paper` (theme Paper to Paddy; Paper’s default purple/blue will fight this system), `expo` / `expo-av` for `/voice/tts`, `react-native-image-picker`, `@react-navigation/*`.

Do not add a new UI kit. Do not add NativeWind unless a later wish asks. One token file is the system.

---

## 14. Screen-by-screen agent prompts

Use with this DESIGN.md **and** FRONTEND.md attached.

**Home**
> Restyle `MobileApp/pages/Home.js` to the Nila Today brief. Kill the horizontal pastel feature FlatList and the 60pt wordmark as the visual climax. Tokens only. Weather from `GET /weather` via `adviceFetch`. Search from `GET /search`. Mandi from `GET /api/market-prices`. No `schemes.json` carousel. Keep i18n keys. 2×3 tool grid. Voice Seed is provided by the tab shell, do not duplicate.

**Care / scan**
> Restyle `Cropcare.js` as a shutter-first diagnosis flow. Keep `launchCamera` / `launchImageLibrary` and `POST /plant-disease`. Result sheet uses leaf_health + confidence. Honor 422. Treatment text is KVK, never a spray list.

**Chat**
> Rebuild `Chatbot.js` as WhatsApp-geometry + `POST /chatbot/ask`. Composer with mic → `/voice/stt`. Show `sources`. Do not fake RAG.

**Market**
> Restyle `MarketPrices.js` as Cash App-scale tabular prices on paper. Remove the green top-tab paint. NearbyStores from `/stores/nearby`. No chrome for Compare/Insights yet.

**Schemes**
> Restyle as ask-thread against `POST /govscheme`. Render titles/links from `schemes`. 503 opens myScheme. TTS on titles via `/voice/tts`.

**Welcome / Auth**
> Field photograph + bottom paper sheet. Phone-first. Bearer token. No OTP. All copy through i18n.

**Notifications**
> Implement the specified list + weather-check. No fake rows.

---

## 15. Iteration guide

1. Tokens in `theme.config.js` + Paper theme + StatusBar/nav bar colors.
2. Shell: Header, Tab bar (same route names), Voice Seed, Toast, Offline banner (top), 401 logout.
3. Home brief (live weather + search + mandi).
4. Care shutter + 422/KVK result.
5. Chat thread → `/chatbot/ask`.
6. Market numbers + stores.
7. Scheme ask + myScheme fallback.
8. Welcome / Auth i18n.
9. Notifications list. Password (current + new). Language (8 locales).
10. Indic font loading + line-height per script.
11. Reduce Motion, 200% font scale, cheap Android pass.
12. Logistics Jobs screen (when that wish lands).

Ship each step looking finished. Do not leave mixed blue/mint/pastel and Paddy on the same screen.

---

## 16. Quality bar (studio)

A screen is done only if:
- It is recognizable as Nila from 10 meters (paper + paddy + seed).
- A farmer can complete the primary task with one thumb in sun.
- Type is vernacular-safe and ≥ 17pt body.
- Motion is quiet and stoppable.
- Contrast holds.
- No leftover Tailwind blue, glass slab, or 60pt decorative wordmark.
- Failed network shows a server sentence, never sample data.
- It matches FRONTEND.md for that screen’s calls.

This is the canonical visual file. When a later wish conflicts with it, update *this* file first, then the code. When a later API change lands, update FRONTEND.md first, then this file’s §7 / §17.

---

## 17. Full inventory (nothing orphaned)

Coverage key: **Specified** = layout + tokens in this file. **Named** = mentioned. **Stub** = code exists but is empty or commented out; design still specified so it cannot ship blank. **Missing** = FRONTEND.md requires it, no page file yet.

### 17.1 Routes / pages

| File | Route name | Status | Primary controls the spec must style |
|---|---|---|---|
| `Welcome.js` | Welcome | Specified | Wordmark, Sign up, Login, language, Made-in-India |
| `Login.js` | Login | Specified | Phone/email toggle, +91, phone, email, password, show/hide, Login |
| `Signup.js` | Signup | Specified | Username, +91, phone, email, password, role, gender, Sign up |
| `Home.js` | Home (tab) | Specified | Avatar, bell, language, settings, SearchBar+mic, weather, 2×3 tools, mandi snapshot, Ask Nila |
| `Schemes.js` | Scheme (tab) | Specified (ask, not bundled catalogue) | Header, thread, composer, Listen, scheme cards |
| `Cropcare.js` | Crop Care (tab) | Specified | Camera, Gallery, leaf health, confidence, KVK copy, Listen |
| `Market/Market.js` | Market (tab) | Specified | Segments: Current Prices, Nearby Stores |
| `Market/MarketPrices.js` | Prices | Specified | Filters, price rows, analysis on live rows |
| `Market/NearbyStores.js` | Stores | Specified | Store rows, mapsUrl, telUrl |
| `Market/PriceComparison.js` | Compare (commented out) | Stub | No chrome until a wish |
| `Market/MarketInsights.js` | Insights (commented out) | Stub | No chrome until a wish |
| `News.js` | News (tab) | Specified | Search, category, state, cards, pull-to-refresh |
| `Chatbot.js` | Chatbot | Specified | Header, bubbles, composer, STT, sources |
| `PostHarvest.js` | PostHarvest | Specified | Crop, date picker, region, submit, advice, Listen |
| `Fertilizers.js` | Fertilizers | Specified | Crop, submit, sections + table, soil_source, Listen |
| `WaterManagement.js` | WaterManagement | Specified | Crop, acres, 5 method chips, submit, advice, Listen |
| `CropSuggestion.js` | CropSuggestion | Specified | Suggest/Calendar segments, acres, windows, month window |
| `Profile.js` | Profile | Specified | Avatar, labeled fields, Edit |
| `UpdateProfile.js` | UpdateProfile | Specified | Photo picker + long form + Save |
| `Settings.js` | Settings | Specified | Completion ring, rows, Jobs, logout |
| `Documents.js` | Documents | Specified | MyDocs / Translate, PDF, list, explain result |
| `LanguageChange.js` | LanguageChange | Specified | 8-language list, confirm |
| `PasswordChange.js` | PasswordChange | Specified | Current + new + confirm (no OTP) |
| `Notifications.js` | Notifications | Specified list | Rows, unread, weather-check, empty |
| (none yet) | Logistics | Missing | Jobs list/create/accept/cancel/done |
| `App.js` | shell | Specified | StatusBar, OfflineBanner top, Toast host, auth gate, Bearer |

### 17.2 Shared components

| File | Status | Notes |
|---|---|---|
| `Header.js` | Specified | Back 44 + title. Replace dark-brown pill |
| `BottomTabNavigator.js` | Specified | 5 tabs, **same route names** |
| `SearchBar.js` | Specified | Mic glyph + `GET /search`. Height 52, paper field |
| `VoicePlayer.js` | Specified | Play/Stop via `/voice/tts` + expo-av. All 8 UI langs through Sarvam |
| `Voice Seed` | Specified, **not in code yet** | New shell control; STT + listening ring |
| `GlassmorphicCard.js` | Specified as retired | Compatibility: render Level-1 Surface |
| `AnimatedButton.js` | Specified | Map variants to Primary / Secondary / Ghost; press-scale 0.97 not 0.95 |
| `AnimatedFadeInView.js` | Specified | Cap 260ms; honor Reduce Motion |
| `StaggeredView.js` | Specified | 50ms stagger, cap 6 |
| `CustomToast.js` | Specified | success / error / info → Paddy Soft / Alert Soft / Monsoon Soft |
| `OfflineBanner` in `App.js` | Specified | Top Monsoon bar, not `position: 'fixed'` |
| `utils/api.js` | Specified (exists) | `accountFetch`, `adviceFetch`, Bearer |

### 17.3 Feature modules ↔ APIs

All advice routes except `GET /health` need Bearer. Account signup and both logins do not.

| Feature | UI surface | API |
|---|---|---|
| Auth signup/login/logout/me | Welcome, Login, Signup, Settings | Account `/api/auth/*` |
| Profile + photo | Profile, UpdateProfile | `/api/auth/update-profile`, `/update-profile-pic` |
| Profile completion | Settings ring | `/api/auth/profile-completion` |
| Password | PasswordChange | `PUT /api/auth/update-password` |
| Documents | Documents MyDocs | `POST /api/upload/upload-doc` field `document` |
| Notifications | Notifications, Home | `GET /api/notifications`, `PUT …/read`, `POST …/weather-check` |
| Logistics jobs | Settings → Jobs | `/api/logistics/jobs` |
| Weather | Home | `GET /weather` |
| Search | SearchBar | `GET /search?q=` |
| Disease scan | Cropcare | `POST /plant-disease` field `image` |
| Fertilizer | Fertilizers | `POST /api/fertilizer_recommendation` |
| Water plan | WaterManagement | `POST /water_management` |
| Crop suggest | CropSuggestion tab A | `POST /crop_suggestion` |
| Crop calendar | CropSuggestion tab B | `POST /crop_calendar` |
| Post-harvest | PostHarvest | `POST /postharvest` |
| Scheme Q&A | Schemes | `POST /govscheme` |
| Scheme teaser | Home | Card to Scheme tab. Not `schemes.json` |
| Document explain | Documents Translate | `POST /translate` field `file` |
| Market prices | MarketPrices | `GET /api/market-prices` |
| Market analysis | MarketPrices card | `POST /api/market-analysis` |
| Nearby stores | NearbyStores | `GET /stores/nearby` |
| Advisory chatbot | Chatbot | `POST /chatbot/ask` |
| News | News | `GET /news` |
| Voice in | Voice Seed / Search mic | `POST /voice/stt` |
| Voice out | VoicePlayer / Listen | `POST /voice/tts` |
| i18n | all | `locales/{en,hi,mr,ta,bn,kn,te,ml}.json` |
| Offline | banner | NetInfo |

### 17.4 Home service cards (all seven)

Each becomes a 2×3 grid tile, Surface, 40pt monochrome glyph, `callout` label. Destinations stay:

1. Post Harvest → `PostHarvest`
2. Manage Water → `WaterManagement`
3. Crop Care → tab `Crop Care`
4. Fertilize → `Fertilizers`
5. Market → tab `Market`
6. Schemes → tab `Scheme`
7. News → tab `News`

Plus one Home entry that stays a full-width action: Ask Nila → `Chatbot`. Crop suggestion is available from Care/Suggest and from the grid if you keep a tile; do not add a second competing banner with the same intent.

### 17.5 Buttons and controls checklist

Every control below uses §6. If a page invents a one-off color, it is out of spec.

- Primary 52 (Paddy)
- Secondary 52 (outline Paddy)
- Ghost 44
- Destructive text row (Alert)
- Voice Seed 64 / VoicePlayer 40 play-stop
- Camera shutter 72 on Care
- Gallery ghost
- Segmented 2-item (Documents, CropSuggestion, Market)
- Filter chips (News categories, irrigation methods, price crop)
- Inputs 52 (text, phone, password, acres, crop, city, state)
- Dropdowns restyled to paper sheets: role, gender, +91, News state, language
- Date picker field (PostHarvest)
- Search fields (Home, News, Market, Schemes composer)
- Cards: weather, service tile, news, store, price row, document row, notification row, scheme result
- Completion ring (Settings)
- Health meter (Cropcare, leaf only)
- Markdown / prose blocks (Chat, Fertilizers, Documents explain, Water/PostHarvest advice)
- Toast three kinds
- Offline banner
- Tab bar 5
- Header back

### 17.6 Known product holes (design still owns the empty state)

- `Notifications.js` was an empty shell; API is live — implement the list.
- `MarketInsights.js` / `PriceComparison.js` are stubs and commented out of the tab bar — do not build chrome until a wish asks.
- `Chatbot.js` is still a router in the UI; wire `/chatbot/ask`.
- `SearchBar` requests mic permission in spirit but renders no mic; add glyph and `/search` + `/voice/stt`.
- `LanguageChange` picker lists 4 locales; app ships 8 JSON files.
- VoicePlayer still uses device TTS; move to Sarvam `/voice/tts`.
- Welcome / Login / Signup / PasswordChange / many toasts are English-hardcoded.
- Role “Logistics” has API jobs but no screen.
- `backendConfig.js` is gitignored. Ship `backendConfig.example.js` with the emulator defaults from FRONTEND.md. Never put keys in it.
- `lat`/`lon` of `0` means missing. Weather, stores, fertilizer, calendar, and alerts need a real location on the profile.
- Home still uses client Open-Meteo (`utils/weather.js`) — restyle must switch to `GET /weather`.
- News still calls SerpAPI from the device in older code — restyle must use `GET /news`.

Design these holes as finished empty/fallback states. Do not pretend the missing screen or failed key is already there.

---

## 18. Agent rule for completeness

Before restyling a file, find it in §17.1. If it is a Stub, implement the specified empty state. If it is Specified, implement that screen’s section in §7 plus the shared components in §6. If it is Missing (Logistics), do not invent it during an unrelated restyle. If a control on that screen is not in §17.5, add it to this file first. If an endpoint is not in FRONTEND.md, do not call it.

---

## 19. Alignment log (2026-09-07)

Surgical corrections so this file can drive work without fighting the live servers:

- Visual system (paper, Paddy, Turmeric, Monsoon, Voice Seed, type, motion) **kept**.
- HTTP, auth, and payloads **deferred to FRONTEND.md**.
- Removed OTP / SMS / Twilio / cookie JWT / Mongo / Groq / CrewAI `/advisory/ask`.
- Chat → `POST /chatbot/ask`. TTS/STT → Sarvam. Weather → `GET /weather`. News → `GET /news`. Fertilizer → `/api/fertilizer_recommendation`.
- Diagnosis: `leaf_health` + `confidence` + 422 + KVK copy only.
- Calendar: official month windows, not invented weeks. No Google Calendar.
- Water / post-harvest: single `advice` + weather.
- Schemes: myScheme payload + link. No `schemes.json` as truth.
- Password: current + new. Notifications: live list. Search: `GET /search`.
- Tab **route names** locked to the current five. “You” tab and News demotion postponed.
- Logistics named as missing, not designed as a second app.
- Duplicate §7 blocks (Chatbot / PostHarvest / News / Profile) merged.
