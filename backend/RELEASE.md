# Release checklist and evidence

## Verification record

The local baseline on 26 November 2026 passed 37 frontend, 26 account, and 58 advice tests. The frontend lint and type checks passed. The built website opened in a browser after its temporary web server stopped. This check covered offline startup and navigation to the sign-in form.

The advice suite was rerun after the scheme request validation fix. All 58 tests passed, including malformed input and missing-key checks. The configured provider path used a simulated response. The compatible Android Gradle settings and iPhone icon were prepared locally.

After the Android PDF picker upgrade and website offline fix, the app passed 38 tests, lint and type checking. The Android x86_64 debug build completed from a short Windows path. On the Android 17 emulator, a synthetic local account opened Documents, canceled the native picker, then selected a sample PDF. The app displayed the file and offered to upload it. This check ended before upload.

The [protected Vercel preview](https://nila-shoshsho-2r819zh5k-m-s-rishav-subhins-projects.vercel.app/) displayed Welcome and reopened offline after caching its 23 static files. The configured advice health route responded. The staging account service returned 404 on its protected profile route, so hosted sign-in remains open. The runtime dependency audit reported two high-severity entries in the Markdown rendering chain. Review those before public promotion.

A read-only Neon check confirmed that the app's serving role can read all ten expected tables and cannot create tables in the public schema. Neon Auth returned a signing key. Upstash responded to a connectivity check. The Windows DNS lookup for Neon required a temporary per-process resolver. Vercel's production routes currently point at staging account and advice services. Confirm production upstreams before public promotion.

The Render workspace listed the account and advice staging services. Both health endpoints responded with HTTP 200. A request to the account profile endpoint without staging access returned HTTP 404. The account and advice test suites passed again with 26 and 58 tests, respectively. Hosted sign-in and authenticated advice remain unverified. Run the provider smoke tests only in an approved environment.

Live provider checks through the advice handlers confirmed that Sarvam synthesized a valid waveform and transcribed the synthetic audio sample. The checks used an isolated profile and did not exercise hosted sign-in. OpenAI generation returned HTTP 429 with an exhausted credit balance. Gemini returned HTTP 503 for text and crop-photo requests. A model lookup succeeded for both providers. Verify actual generation before opening public traffic.

The separate Render account and advice services deployed from commit `a6a4047`. Both health endpoints returned HTTP 200. The profile and search routes returned HTTP 404 without the generated access key. This verifies availability and the access gate. A signed-in hosted journey and Vercel production cutover are still open.

Earlier records report synthetic Neon account and restore checks dated 20 November 2026. Use Git history for the original evidence and environment-specific details. Rehearse hosted restoration before release.

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
- Future forecasts require licensed historical data and evaluation against baselines. Satellite advice requires plot boundaries, dated observations, cloud handling and human review.
