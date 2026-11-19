import { createHash } from "node:crypto";

export function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function isRevoked(sql, token) {
  const rows = await sql`SELECT token_hash FROM revoked_tokens
                         WHERE token_hash=${tokenHash(token)} AND expires_at > now()`;
  return rows.length > 0;
}

export async function revoke(sql, token, expires) {
  await sql`INSERT INTO revoked_tokens (token_hash, expires_at)
            VALUES (${tokenHash(token)}, to_timestamp(${expires}))
            ON CONFLICT (token_hash) DO NOTHING`;
}
