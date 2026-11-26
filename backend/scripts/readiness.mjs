import "../src/lib/env.js";
import { getSql } from "../src/lib/db.js";

async function check() {
  if (process.env.NODE_ENV !== "production")
    throw new Error("production configuration");
  for (const name of [
    "GOV_ID_KEY",
    "NEON_AUTH_JWKS_URL",
    "NEON_AUTH_BASE_URL",
    "DATABASE_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "NEON_AUTH_ISSUER",
    "NEON_AUTH_AUDIENCE",
  ]) {
    if (!process.env[name]) throw new Error(name);
  }
  if (
    !/^[a-f0-9]{64}$/i.test(process.env.GOV_ID_KEY) &&
    process.env.GOV_ID_KEY.length < 32
  ) {
    throw new Error("government ID encryption configuration");
  }
  const signal = AbortSignal.timeout(5000);
  const sql = getSql();
  await sql.query(
    "SELECT f.neon_user_id FROM farmers f LEFT JOIN account_reviews r ON r.farmer_id=f.neon_user_id LEFT JOIN pending_uploads p ON p.farmer_id=f.neon_user_id CROSS JOIN revoked_tokens CROSS JOIN account_sessions CROSS JOIN voice_callbacks CROSS JOIN farm_plots LIMIT 0",
    [],
    { fetchOptions: { signal } },
  );
  const keys = await fetch(process.env.NEON_AUTH_JWKS_URL, {
    signal,
    redirect: "error",
  });
  if (!keys.ok || !(await keys.json()).keys?.length)
    throw new Error("identity keys");
  const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
  if (url.protocol !== "https:") throw new Error("counter service transport");
  const cache = await fetch(url, {
    method: "POST",
    signal,
    redirect: "error",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["PING"]),
  });
  if (!cache.ok || (await cache.json()).result !== "PONG")
    throw new Error("counter service");
}

try {
  await check();
  console.info("Account dependencies ready.");
} catch {
  console.error(
    "Account readiness failed. Check production configuration, database, identity keys and counters.",
  );
  process.exitCode = 1;
}
