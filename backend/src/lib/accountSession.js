import { createHmac } from "node:crypto";
import { compactDecrypt, CompactEncrypt } from "jose";
import { tokenHash } from "./revocation.js";

function sessionKey() {
  const key = process.env.GOV_ID_KEY;
  if (!key || key.length < 32)
    throw new Error("Session encryption is not configured");
  return createHmac("sha256", key).update("nila:neon-auth-session:v1").digest();
}

export async function saveSession(sql, token, farmer, expires, cookie) {
  const hash = tokenHash(token);
  const encrypted = await new CompactEncrypt(Buffer.from(cookie))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", kid: hash })
    .encrypt(sessionKey());
  await sql`INSERT INTO account_sessions (token_hash, farmer_id, encrypted_cookie, expires_at)
    VALUES (${hash}, ${farmer}, ${encrypted}, to_timestamp(${expires}))
    ON CONFLICT (token_hash) DO UPDATE SET encrypted_cookie=excluded.encrypted_cookie`;
}

export async function getSessionCookie(sql, token, farmer) {
  const hash = tokenHash(token);
  const [row] = await sql`SELECT encrypted_cookie FROM account_sessions
    WHERE token_hash=${hash} AND farmer_id=${farmer} AND expires_at > now()`;
  if (!row) return null;
  const { plaintext, protectedHeader } = await compactDecrypt(
    row.encrypted_cookie,
    sessionKey(),
    {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    },
  );
  if (protectedHeader.kid !== hash) throw new Error("Session record mismatch");
  return Buffer.from(plaintext).toString("utf8");
}

export async function closeSession(sql, token, expires) {
  const hash = tokenHash(token);
  await sql.transaction((tx) => [
    tx`INSERT INTO revoked_tokens (token_hash, expires_at) VALUES (${hash}, to_timestamp(${expires}))
      ON CONFLICT DO NOTHING`,
    tx`DELETE FROM account_sessions WHERE token_hash=${hash}`,
  ]);
}

export async function closeOtherSessions(sql, token, farmer) {
  const hash = tokenHash(token);
  await sql`WITH removed AS (
    DELETE FROM account_sessions WHERE farmer_id=${farmer} AND token_hash<>${hash}
    RETURNING token_hash, expires_at)
    INSERT INTO revoked_tokens (token_hash, expires_at)
    SELECT token_hash, expires_at FROM removed WHERE expires_at > now() ON CONFLICT DO NOTHING`;
}
