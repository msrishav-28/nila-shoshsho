import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPair, SignJWT } from "jose";
import { readBearer } from "./bearer.js";
import { verifyAccessToken } from "./verifyToken.js";

test("missing authorization is rejected", () => {
  assert.equal(readBearer({ headers: {} }), null);
});

test("non-bearer schemes are rejected", () => {
  assert.equal(readBearer({ headers: { authorization: "Basic abc" } }), null);
});

test("bearer token is returned", () => {
  assert.equal(
    readBearer({ headers: { authorization: "Bearer tok_123" } }),
    "tok_123",
  );
});

test("signing key outage is unavailable rather than an invalid credential", async (t) => {
  const keys = createServer((_req, res) => {
    res.writeHead(503);
    res.end();
  });
  await new Promise((resolve) => keys.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => keys.close(resolve)));
  process.env.NEON_AUTH_JWKS_URL = "http://127.0.0.1:" + keys.address().port;
  process.env.NEON_AUTH_ISSUER = "fixture";
  process.env.NEON_AUTH_AUDIENCE = "fixture";
  const { privateKey } = await generateKeyPair("EdDSA");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "EdDSA", kid: "fixture" })
    .setIssuer("fixture")
    .setAudience("fixture")
    .setSubject("00000000-0000-4000-8000-000000000001")
    .setExpirationTime("2m")
    .sign(privateKey);
  await assert.rejects(verifyAccessToken(token), { status: 503 });
  await assert.rejects(verifyAccessToken("bad-token"), { status: 401 });
});
