import { neon, neonConfig } from "@neondatabase/serverless";
import "./env.js";

neonConfig.fetchFunction = (input, options = {}) =>
  fetch(input, {
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(8000)])
      : AbortSignal.timeout(8000),
    redirect: "error",
  });

let sql;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export async function assertDb() {
  const client = getSql();
  await client`SELECT f.neon_user_id, f.profile_version, r.reviewed_value, p.public_id, t.token_hash
    FROM farmers f
    LEFT JOIN account_reviews r ON r.farmer_id=f.neon_user_id
    LEFT JOIN pending_uploads p ON p.farmer_id=f.neon_user_id
    CROSS JOIN revoked_tokens t
    CROSS JOIN account_sessions s
    CROSS JOIN voice_callbacks c
    CROSS JOIN farm_plots plots LIMIT 0`;
}
