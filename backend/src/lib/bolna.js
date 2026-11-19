const ENDPOINT = "https://api.bolna.ai";
export const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const indianMobile = /^\+91[6-9]\d{9}$/;
const failed = new Set([
  "no-answer",
  "busy",
  "failed",
  "canceled",
  "stopped",
  "error",
  "balance-low",
]);

export function bolnaConfig() {
  const {
    BOLNA_CALLBACK_ENABLED,
    BOLNA_API_KEY,
    BOLNA_AGENT_ID,
    BOLNA_FROM_PHONE_NUMBER,
    BOLNA_TEST_RECIPIENTS,
    BOLNA_DAILY_LIMIT = "5",
  } = process.env;
  const dailyLimit = Number(BOLNA_DAILY_LIMIT);
  if (
    BOLNA_CALLBACK_ENABLED !== "true" ||
    !BOLNA_API_KEY?.trim() ||
    !uuidPattern.test(BOLNA_AGENT_ID || "") ||
    !Number.isInteger(dailyLimit) ||
    dailyLimit < 1 ||
    dailyLimit > 50 ||
    (BOLNA_FROM_PHONE_NUMBER &&
      !/^\+[1-9]\d{7,14}$/.test(BOLNA_FROM_PHONE_NUMBER))
  )
    return null;

  const recipients = new Map();
  const numbers = new Set();
  for (const entry of (BOLNA_TEST_RECIPIENTS || "").split(",")) {
    const [account, number, ...extra] = entry.trim().split("=");
    if (
      extra.length ||
      !uuidPattern.test(account) ||
      !indianMobile.test(number) ||
      recipients.has(account.toLowerCase()) ||
      numbers.has(number)
    )
      return null;
    recipients.set(account.toLowerCase(), number);
    numbers.add(number);
  }
  return {
    key: BOLNA_API_KEY.trim(),
    agent: BOLNA_AGENT_ID,
    from: BOLNA_FROM_PHONE_NUMBER,
    recipients,
    dailyLimit,
  };
}

async function request(config, path, body) {
  return fetch(ENDPOINT + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + config.key,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
    redirect: "error",
  });
}

export async function startCallback(config, recipient) {
  try {
    const response = await request(config, "/call", {
      agent_id: config.agent,
      recipient_phone_number: recipient,
      ...(config.from ? { from_phone_number: config.from } : {}),
    });
    if ([400, 401, 402, 403, 404, 422, 429].includes(response.status)) {
      await response.body?.cancel();
      return { status: "failed", executionId: null };
    }
    if (!response.ok) {
      await response.body?.cancel();
      return { status: "unknown", executionId: null };
    }
    const data = await response.json();
    if (uuidPattern.test(data?.execution_id || ""))
      return { status: "queued", executionId: data.execution_id };
  } catch {
    // A timeout can happen after Bolna accepted the call. Never redial automatically.
  }
  return { status: "unknown", executionId: null };
}

export async function callbackStatus(config, executionId) {
  const response = await request(config, "/executions/" + executionId);
  if (!response.ok) {
    await response.body?.cancel();
    return null;
  }
  const data = await response.json();
  if (data.id !== executionId || data.agent_id !== config.agent) return null;
  if (data.status === "completed") return "completed";
  if (failed.has(data.status)) return "failed";
  if (["in-progress", "call-disconnected", "ringing"].includes(data.status))
    return "in_progress";
  return null;
}
