import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks;

function getJwks() {
  const url = process.env.NEON_AUTH_JWKS_URL;
  if (!url) {
    throw new Error("NEON_AUTH_JWKS_URL is not set");
  }
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url));
  }
  return jwks;
}

export async function verifyAccessToken(token) {
  if (!token) {
    const err = new Error("Missing access token");
    err.status = 401;
    throw err;
  }
  try {
    const { payload } = await jwtVerify(token, getJwks());
    const neonUserId = payload.sub;
    if (!neonUserId) {
      const err = new Error("Token is missing subject");
      err.status = 401;
      throw err;
    }
    return { neonUserId, email: payload.email || null, payload };
  } catch (cause) {
    if (cause.status) {
      throw cause;
    }
    const err = new Error("Unauthorized - token is invalid");
    err.status = 401;
    throw err;
  }
}

export { readBearer } from "./bearer.js";
