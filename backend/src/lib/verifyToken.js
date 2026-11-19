import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks;

function getJwks() {
  const url = process.env.NEON_AUTH_JWKS_URL;
  if (!url) {
    const error = new Error("Identity validation is not configured");
    error.status = 503;
    throw error;
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
    const issuer = process.env.NEON_AUTH_ISSUER;
    const audience = process.env.NEON_AUTH_AUDIENCE;
    if (process.env.NODE_ENV === "production" && (!issuer || !audience)) {
      const error = new Error("Identity validation is not configured");
      error.status = 503;
      throw error;
    }
    const { payload } = await jwtVerify(token, getJwks(), {
      algorithms: ["EdDSA", "RS256", "ES256"],
      requiredClaims: ["sub", "exp"],
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
    });
    const neonUserId = payload.sub;
    if (
      typeof neonUserId !== "string" ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(neonUserId)
    ) {
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
    err.status =
      cause instanceof TypeError ||
      ["ERR_JWKS_TIMEOUT", "ERR_JWKS_INVALID", "ERR_JOSE_GENERIC"].includes(
        cause.code,
      )
        ? 503
        : 401;
    throw err;
  }
}

export { readBearer } from "./bearer.js";
