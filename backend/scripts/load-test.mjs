const accountBase = process.env.ACCOUNT_URL || "http://127.0.0.1:5001";
const adviceBase = process.env.ADVICE_URL || "http://127.0.0.1:5002";
const total = Number(process.env.LOAD_REQUESTS || 200);
const concurrency = Number(process.env.LOAD_CONCURRENCY || 20);

async function hit(url, options = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), ...options });
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - started, error: err.message };
  }
}

async function runBatch(url, label, options) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < total) {
      const i = next;
      next += 1;
      results[i] = await hit(url, options);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const ok = results.filter((row) => row.ok).length;
  const fail = results.length - ok;
  const times = results.map((row) => row.ms).sort((a, b) => a - b);
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  const statuses = {};
  for (const row of results) {
    const key = String(row.status || row.error || "error");
    statuses[key] = (statuses[key] || 0) + 1;
  }
  return { label, url, ok, fail, p95, statuses };
}

const reports = [];
reports.push(await runBatch(`${accountBase}/health`, "account-health"));
reports.push(await runBatch(`${adviceBase}/health`, "advice-health"));
reports.push(
  await runBatch(`${adviceBase}/chatbot/ask`, "advice-chat-no-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
);

for (const report of reports) {
  console.log(JSON.stringify(report));
}

if (reports.some((report) => report.label.endsWith("health") && report.ok === 0)) {
  process.exitCode = 1;
}
