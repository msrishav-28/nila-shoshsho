# Refined 2 design

The approved frontend design is the 37 screens and states under **Refined 2** in Wonder Tarpon, Page 1. [App.js](MobileApp/App.js) loads the shared interface. **Ask Nila Review** is in Refined 2 and lets the user read or correct the transcription before sending it. Use the section heading to distinguish it from artboards in the separate Review and Review study sections.

| Area | Refined 2 screens and states | Count |
| --- | --- | --- |
| Entry | Welcome, Login, Signup, Startup Loading | 4 |
| Home and farm | Home, Home Offline, Farm Setup, Farm Monitoring | 4 |
| Market and discovery | Schemes, Market Prices, Nearby Stores, Price Comparison, Market Insights, News | 6 |
| Crop and farm tools | Cropcare, Crop Check Uncertain, Post Harvest, Water Management, Fertilizers, Crop Suggestion, Crop Calendar | 7 |
| Ask Nila | Chatbot, Ask Nila Listening, Ask Nila Review, Ask Nila Connection | 4 |
| Account | Settings, Profile, Update Profile, Language Change, Password Change, Notifications, Choose Profile Picture, Notification Preferences | 8 |
| Documents and transport | Documents, Document Translate, Logistics, Logistics Partner | 4 |

## Selected artboards

| Home | Crop Care |
| --- | --- |
| <img src="README_assets/refined-home.png" width="235" alt="Refined 2 Home"> | <img src="README_assets/refined-crop-care.png" width="235" alt="Refined 2 Crop Care"> |

| Market Prices | Farm Monitoring |
| --- | --- |
| <img src="README_assets/refined-market-prices.png" width="235" alt="Refined 2 Market Prices"> | <img src="README_assets/refined-farm-monitoring.png" width="235" alt="Refined 2 Farm Monitoring"> |

Start with Welcome on the [web beta](https://nila-shoshsho-pwa.vercel.app/). Use an isolated test account to check signed-in screens. On Android and iPhone, repeat the same journeys and check platform-specific behavior for file picking, camera, microphone and session storage. Verify loading, empty, offline, permission and provider-failure messages as actual screens. The Android emulator check reached PDF selection. Full document upload and iPhone device checks are still pending.

See the [user guide](docs/USER_GUIDE.md) for common journeys and the [release record](backend/RELEASE.md) for verified platforms and pending checks.
