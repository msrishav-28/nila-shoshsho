const AUTH_TIMEOUT_MS = 15000;

function authBase() {
  const base = process.env.NEON_AUTH_BASE_URL;
  if (!base) {
    throw new Error("NEON_AUTH_BASE_URL is not set");
  }
  return base.replace(/\/$/, "");
}

async function authFetch(path, { method = "POST", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${authBase()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  return { ok: response.ok, status: response.status, payload };
}

export function extractAccessToken(payload) {
  const data = payload?.data ?? payload;
  return (
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
  return authFetch("/sign-up/email", {
    body: { email, password, name },
  });
}

export async function neonSignIn({ email, password }) {
  return authFetch("/sign-in/email", {
    body: { email, password },
  });
}

export async function neonChangePassword({ token, currentPassword, newPassword }) {
  return authFetch("/change-password", {
    token,
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    },
  });
}

export async function neonSignOut({ token }) {
  return authFetch("/sign-out", { token });
}
