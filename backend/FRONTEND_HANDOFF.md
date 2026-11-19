# Backend integration handoff

The current release target is a hackathon/demo/portfolio backend that can be extended into a public product. Forecasting, satellite monitoring and live government records remain later capabilities. The telephone callback pilot has an authenticated API and requires operator enrollment and live telephony verification.

Farmer accounts can list and create plots at `/api/plots` and edit or delete them at `/api/plots/{plotId}`. Creation requires an `Idempotency-Key` and `crop`, `lat`, `lon`, `areaAcres` and `sowingDate`. Reuse the same key for retries while the plot exists. Use a new key to create a new plot. The list is private and capped at 100. The coordinates describe an approximate center supplied by the farmer. These records carry no official land verification or satellite assessment.

The Android, iOS and web/PWA clients use the same API routes and bearer token format. For browser deployment, allow the exact frontend HTTPS origin on both services. Treat session restoration, secure browser token handling and reauthentication when the Neon access token expires as part of frontend integration.

To request a pilot call, send POST /api/voice-callbacks with an Idempotency-Key and the JSON body `{"consent":true}` after explaining that the user will receive one automated call at their enrolled number. Reuse the same key for a retry. GET /api/voice-callbacks/{id} returns the account owner's status. Poll no more often than every ten seconds and stop at completed, failed or unknown. A queued response confirms provider acceptance, and unknown means the call may have been submitted. Surface that uncertainty so the user does not request a replacement call.

## Import and configure

Import openapi.json for the two local API origins, and use api-contract.json for the caller/dependency inventory. Configure production HTTPS origins in the frontend release environment. API schemas describe integration boundaries. Read source and acceptance tests for additional business rules.

The account service runs on port 5001 and advice on 5002. Advice requests also require the account service to be reachable through ACCOUNT_URL. All application routes require a signed access token except signup and email login. Health remains public.

Read configuration names from the root .env.example. Keys belong in the root .env.local or server secret storage. Set the expected identity issuer and audience for both services to match the actual deployed identity contract. STAFF_USER_IDS contains the UUIDs of staff accounts authorized to make review decisions. Create normal accounts first, then configure this server-side allowlist.

## Accounts and access

- Signup accepts email, password, username, gender and requested role. Logistics accounts await staff approval. Expose the pending state using user.carrierApproved. The signup form's role is a requested product role, and subsequent profile edits cannot switch it.
- Send Authorization: Bearer with the access token on private calls. Handle 401 by returning to sign-in. A refresh-token API is not provided in this release. Token expiry follows the configured identity provider.
- Treat successful logout as session termination. A failed provider request returns 502 so the client can report incomplete sign-out. Successful logout also records local token revocation, which both services enforce.
- user.isVerified comes from an independent staff review of the current identifier. Entering an identifier does not establish verification. The owner may update ordinary profile fields. Attempts to set approval flags are rejected.
- user.profileVersion supports safe profile edits. Send profileVersion with an update to reject stale submissions with 409, then refresh before retrying.
- Staff use PUT /api/reviews/{userId}/{kind}, where kind is carrier or identity, with a boolean approved and a short reason. Ordinary accounts receive 403. Self-review is forbidden. Review events are retained for audit.

## Documents and photos

- Upload a single unlocked PDF with 1–100 pages and at most 10 MB using multipart field document. At most 50 documents can be attached to an account. User documents contains signed links that expire after five minutes.
- Fetch the profile again before opening a stale document link. The existing external PDF viewer can open the signed HTTPS URL. Do not persist a signed URL as a permanent asset identifier or include it in analytics.
- Profile pictures use a JPEG/PNG/WebP data URI in profilePic. The server decodes, rotates, resizes and removes metadata before private storage. The returned picture URL also expires after five minutes.
- Document explanation accepts an unlocked PDF up to 8 MB. The response preserves translated_document and adds partial when extraction reached 50 pages or 20,000 characters. Partial results include a visible notice in the returned explanation.

## Transport and notifications

- Farmers create and cancel their own open jobs. Approved carriers view and claim open jobs and complete their own accepted jobs. Revoked or pending carriers cannot perform carrier actions.
- For safe POST /api/logistics/jobs retries, generate a stable Idempotency-Key of 8–100 letters, digits, hyphens or underscores for each submission. Reusing the key with the same content returns the original job. Different content returns 409.
- Treat a failed competing acceptance as a reason to refresh the board. Only one carrier wins. Existing PUT action paths remain compatible.
- Notifications are retrieved from the account API. Weather-check is request-triggered, with per-farmer daily deduplication. This release does not send background phone calls or push notifications.

## Advice and sources

- Show source and observation dates supplied by price and weather responses. Provider outages, empty datasets and insufficient evidence are distinct states. An empty market result cannot establish that a commodity is unavailable locally.
- Submitted market analysis is labelled Submitted market records. Mandi insight commentary uses the retrieved rows. Future prices are not generated.
- Treat crop-photo results as an assessment requiring human judgment. Confidence is a model score, not measured diagnostic accuracy. An uncertain photo returns 422 with a safe next step.
- Fertilizer responses include rate_available=false until reviewed field guidance is available. Render the returned explanation and soil provenance. Estimated mapped soil is distinct from a measured field sample.
- Crop calendars are typical seasonal references. Local planting suitability still needs review. Soil, irrigation and harvest context must remain visible with advice.
- Scheme results do not verify eligibility or submit claims. News retains publication dates and publisher attribution. Nearby stores are map listings.
- Speech playback returns audio_base64 containing WAV data. Recognition returns transcript. Standard language aliases cover English, Hindi, Bengali, Marathi, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi and Odia. Provider entitlement and language quality still need live checks.

## Error handling

Account errors preserve success=false and message. Advice errors preserve error. Both add code and X-Request-ID. Use code for localized client messages and request IDs for support. Handle 400/413 as input problems, 401 as sign-in required, 403 as insufficient access, 409 as a changed/conflicting request, 422 as insufficient evidence, 429 with Retry-After, and 502/503 as temporary/configuration/dependency failures.

## Coverage targets and verification

The owner intends major agricultural states and crops first, with later expansion across India and standard languages. Initial validation targets are Punjab, Haryana, Uttar Pradesh, Madhya Pradesh, Maharashtra, Gujarat, Rajasthan, Karnataka, Andhra Pradesh, Telangana, Tamil Nadu, West Bengal, Bihar and Odisha. Representative crops include paddy, wheat, maize, cotton, soybean, mustard, groundnut, pulses, sugarcane, onion, potato and tomato. These are chosen validation targets. A state or crop's inclusion does not certify advice quality, source completeness or every feature's availability.

Automated journeys use synthetic accounts and controlled provider fixtures. They exercise the actual HTTP handlers, signed tokens, SQL, private-link generation and each advice route. Live Neon identity, Cloudinary retrieval/expiry, data feeds, model accounts, audio playback, production containers and capacity remain separate acceptance checks. See RELEASE.md and IMPLEMENTATION_STATUS.md for current evidence.
