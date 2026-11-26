const AUTH_TIMEOUT_MS = 15000;

function authBase() {
  const base = process.env.NEON_AUTH_BASE_URL;
  if (!base) {
    throw new Error("NEON_AUTH_BASE_URL is not set");
  }
  return base.replace(/\/$/, "");
}

async function authFetch(path, { method = "POST", body, cookie } = {}) {
  const base = authBase();
  const headers = {
    "Content-Type": "application/json",
    Origin: new URL(base).origin,
  };
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    redirect: "error",
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  const accessToken = response.headers.get("set-auth-jwt");
  if (accessToken && payload && typeof payload === "object") {
    payload = { ...payload, access_token: accessToken };
  }
  const sessionCookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .find((value) =>
      /^[A-Za-z0-9_.-]*\.session_token=[^;\s]{1,4096}$/.test(value),
    );
  return { ok: response.ok, status: response.status, payload, sessionCookie };
}

async function signInFlow(path, body) {
  const result = await authFetch(path, { body });
  if (!result.ok) return result;
  if (!result.sessionCookie) return { ok: false, status: 502, payload: {} };
  if (result.payload?.access_token) return result;
  const session = await authFetch("/get-session", {
    method: "GET",
    cookie: result.sessionCookie,
  });
  if (
    !session.ok ||
    !session.payload?.access_token ||
    extractAuthUser(session.payload)?.id !== extractAuthUser(result.payload)?.id
  ) {
    return { ok: false, status: 502, payload: {} };
  }
  return {
    ...session,
    sessionCookie: session.sessionCookie || result.sessionCookie,
  };
}

export function extractAccessToken(payload) {
  const data = payload?.data ?? payload;
  return (
    payload?.access_token ||
    data?.session?.access_token ||
    data?.session?.token ||
    data?.access_token ||
    data?.token ||
    payload?.session?.access_token ||
    null
  );
}

export function extractAuthUser(payload) {
  const data = payload?.data ?? payload;
  return data?.user || payload?.user || null;
}

export async function neonSignUp({ email, password, name }) {
  return signInFlow("/sign-up/email", { email, password, name });
}

export async function neonSignIn({ email, password }) {
  return signInFlow("/sign-in/email", { email, password });
}

export async function neonChangePassword({
  cookie,
  currentPassword,
  newPassword,
}) {
  return authFetch("/change-password", {
    cookie,
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    },
  });
}

export async function neonSignOut({ cookie }) {
  return authFetch("/sign-out", { cookie, body: {} });
}
