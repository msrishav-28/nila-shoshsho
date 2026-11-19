import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import express from "express";
import { rateLimit } from "../middleware/security.js";
// This test process only uses the local counters and never contacts a configured provider.
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.UPSTASH_REDIS_REST_TOKEN = "";
process.env.NODE_ENV = "test";
const { app } = await import("../index.js");

async function localServer(t, application) {
  const server = await new Promise((resolve, reject) => {
    const listener = application.listen(0, "127.0.0.1", () =>
      resolve(listener),
    );
    listener.once("error", reject);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return "http://127.0.0.1:" + server.address().port;
}

test("protected account routes match the release inventory and reject anonymous requests", async (t) => {
  const origin = await localServer(t, app);
  const contract = JSON.parse(
    await readFile(new URL("../../api-contract.json", import.meta.url)),
  );
  const routes = contract.routes.filter((r) => r.service === "account");
  assert.equal(routes.length, 25);
  for (const entry of routes.filter(
    (r) => !["public", "optional bearer"].includes(r.access),
  )) {
    const response = await fetch(
      origin +
        entry.path
          .replace(":id", "1")
          .replace(":userId", "00000000-0000-4000-8000-000000000001")
          .replace(":plotId", "00000000-0000-4000-8000-000000000001")
          .replace(":kind", "carrier"),
      { method: entry.method },
    );
    assert.equal(response.status, 401, entry.path);
    assert.equal((await response.json()).code, "unauthorized");
    assert.ok(response.headers.get("X-Request-ID"));
  }
});

test("separate local policies retain independent windows and ignore unverified headers", async (t) => {
  const application = express();
  const global = rateLimit({
    namespace: "test-global",
    windowMs: 60000,
    max: 10,
  });
  const signup = rateLimit({
    namespace: "test-signup",
    windowMs: 900000,
    max: 1,
  });
  application.use(global);
  application.get("/signup", signup, (_req, res) => res.sendStatus(200));
  application.get("/login", (_req, res) => res.sendStatus(200));
  const origin = await localServer(t, application);
  assert.equal((await fetch(origin + "/signup")).status, 200);
  const limited = await fetch(origin + "/signup", {
    headers: { Authorization: "fixture" },
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "900");
  assert.equal((await fetch(origin + "/login")).status, 200);
});

test("staging hides account routes until the deployment key is supplied", async (t) => {
  const previous = process.env.STAGING_ACCESS_KEY;
  process.env.STAGING_ACCESS_KEY = "account-fixture-stage-key".repeat(2);
  t.after(() => {
    if (previous === undefined) delete process.env.STAGING_ACCESS_KEY;
    else process.env.STAGING_ACCESS_KEY = previous;
  });
  const origin = await localServer(t, app);
  assert.equal((await fetch(origin + "/health")).status, 200);
  assert.equal((await fetch(origin + "/api/auth/me")).status, 404);
  assert.equal(
    (
      await fetch(origin + "/api/auth/me", {
        headers: { "X-Staging-Key": process.env.STAGING_ACCESS_KEY },
      })
    ).status,
    401,
  );
});
