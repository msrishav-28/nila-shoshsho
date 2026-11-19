import "../src/lib/env.js";
const accountBase = process.env.ACCOUNT_URL || "http://127.0.0.1:5001";
const adviceBase = process.env.ADVICE_URL || "http://127.0.0.1:5002";
const total = Number(process.env.LOAD_REQUESTS || 12);
const concurrency = Number(process.env.LOAD_CONCURRENCY || 3);

for (const endpoint of [accountBase, adviceBase]) {
  const target = new URL(endpoint);
  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password ||
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
  ) {
    throw new Error("Run this load check against local fixture services");
  }
}
if (
  !Number.isInteger(total) ||
  total < 1 ||
  total > 1000 ||
  !Number.isInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > 50
) {
  throw new Error("Use 1–1000 requests and 1–50 concurrent clients");
}

async function hit(url, options = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      ...options,
    });
    await res.arrayBuffer();
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - started,
      error: err.message,
    };
  }
}

async function runBatch(
  url,
  label,
  options,
  expectedStatuses = [200],
  count = total,
) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < count) {
      const i = next;
      next += 1;
      results[i] = await hit(url, options);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const ok = results.filter((row) =>
    expectedStatuses.includes(row.status),
  ).length;
  const fail = results.length - ok;
  const times = results.map((row) => row.ms).sort((a, b) => a - b);
  const p95 =
    times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  const statuses = {};
  for (const row of results) {
    const key = String(row.status || row.error || "error");
    statuses[key] = (statuses[key] || 0) + 1;
  }
  return { label, expectedStatuses, ok, fail, p95, statuses };
}

const reports = [];
reports.push(await runBatch(`${accountBase}/health`, "account-health"));
reports.push(await runBatch(`${adviceBase}/health`, "advice-health"));
if (process.env.LOAD_TEST_TOKEN) {
  // Keep the signed smoke below the pre-auth IP quota even during a large liveness test.
  const signedCount = Math.min(total, 12);
  const options = {
    headers: { Authorization: `Bearer ${process.env.LOAD_TEST_TOKEN}` },
  };
  reports.push(
    await runBatch(
      `${accountBase}/api/notifications`,
      "account-notifications",
      options,
      [200],
      signedCount,
    ),
  );
  reports.push(
    await runBatch(
      `${adviceBase}/search?q=market`,
      "advice-search",
      options,
      [200],
      signedCount,
    ),
  );
} else {
  console.info(
    "Authenticated workload skipped. Configure LOAD_TEST_TOKEN for a synthetic account.",
  );
}

const anonymous = await runBatch(
  `${adviceBase}/chatbot/ask`,
  "advice-chat-no-token",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  },
  [401, 429],
);
reports.push(anonymous);

for (const report of reports) {
  console.log(JSON.stringify(report));
}

const rejectionVerified = Boolean(anonymous.statuses[401]);
const throttleVerified = total <= 60 || Boolean(anonymous.statuses[429]);
if (
  reports.some((report) => report.fail > 0) ||
  !rejectionVerified ||
  !throttleVerified
) {
  if (!rejectionVerified || !throttleVerified)
    console.error(
      "Could not verify the anonymous admission policy. Start with fresh fixture counters.",
    );
  process.exitCode = 1;
}
