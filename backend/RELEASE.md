# Release checklist and evidence

## Beta verification on 26 November 2026

| Area | Verified | Still open |
| --- | --- | --- |
| [Public website](https://nila-shoshsho-pwa.vercel.app/) | The homepage and install files loaded while signed out. Signup and login rejected empty submissions with `400`. Private profile, plot reads and writes, and advice search returned `401`. | Create and use a test account through the live site under an approved test plan. |
| Isolated Render staging | Two made-up accounts signed up and logged in. One saved and reopened a plot. The second account could not see it. Notifications, advice search and logout passed. | Keep the staging environment available for future tests that save records. |
| Hosting | The two production Render services returned `200` from their health checks. The four Vercel rules sending traffic to staging were disabled. The main website is public and Vercel protects preview addresses. | Recheck signup, private routes and document upload after hosting changes. |
| Data and providers | The Neon serving account could read the ten expected tables and was denied permission to create tables. Neon Auth returned a signing key and Upstash responded. In isolated handler checks, Gemini answered a question and Sarvam transcribed and synthesized audio. | Rehearse hosted restoration and review real plant-photo cases with a qualified reviewer. OpenAI returned a billing limit error during its check. |
| Install and devices | A protected website preview reopened offline. The Android emulator build opened Documents, canceled the picker and selected a sample PDF. | Verify the full document upload on a device. Build and sign the iPhone app, then test it on a device. |
| Automated checks | The beta candidate passed 42 app tests, lint and type checking. The account suite passed 26 tests and the advice suite passed 59. The formatter update cleared two high-severity package findings. | Four moderate findings remained at the last recorded package audit. |

Production checks used empty submissions and signed-out requests. The successful account creation, storage and ownership checks used the isolated staging database. Earlier records, including the protected preview and recovery checks, are in Git history.

## Acceptance checklist

1. Identify the exact build, environment, test account scope and person responsible.
2. In the website and each device build, sign in, save a plot, reopen it and verify a second synthetic account cannot read it.
3. Check allowed and denied staff decisions, private documents, and competing carrier acceptances.
4. Exercise provider failures, offline restart and stale data notices. Verify real providers with a separately agreed budget and account.
5. Check logs for reporting failures without private details. Restore database and private files into an isolated environment.
6. Record checks, results, outstanding risks, owner and rollback instructions. Confirm agricultural review for advice used to make farming decisions.

Use the [deployment guide](../docs/DEPLOYMENT.md) for build and hosting settings.

## Provider work still open

- Verify myScheme and government market provider access when the corresponding keys are available.
- DigiLocker and AgriStack require approved partner contracts, consent, and privacy and retention decisions.
- Official severe-weather notices need approved access and tested district mapping.
- Telephone callbacks require enrolled test recipients and an approved provider run.
- Future forecasts require licensed historical data and evaluation against baselines. Satellite advice requires plot boundaries, dated observations, cloud handling and human review.
