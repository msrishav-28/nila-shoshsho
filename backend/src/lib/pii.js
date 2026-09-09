import crypto from "crypto";

const PREFIX = "enc:v1:";

function keyBuffer() {
  const raw = process.env.GOV_ID_KEY || "";
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  if (raw.length >= 32) {
    return crypto.createHash("sha256").update(raw).digest();
  }
  return null;
}

export function encryptGovId(plain) {
  if (!plain) {
    return "";
  }
  if (plain.startsWith(PREFIX)) {
    return plain;
  }
  const key = keyBuffer();
  if (!key) {
    if ((process.env.NODE_ENV || "development") === "production") {
      const err = new Error("GOV_ID_KEY is not set");
      err.status = 500;
      throw err;
    }
    return plain;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptGovId(stored) {
  if (!stored) {
    return "";
  }
  if (!stored.startsWith(PREFIX)) {
    return (process.env.NODE_ENV || "development") === "production" ? "" : stored;
  }
  const key = keyBuffer();
  if (!key) {
    return "";
  }
  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
