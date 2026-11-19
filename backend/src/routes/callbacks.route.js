import { randomUUID } from "node:crypto";
import express from "express";
import { getSql } from "../lib/db.js";
import {
  bolnaConfig,
  callbackStatus,
  startCallback,
  uuidPattern,
} from "../lib/bolna.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protectRoute);

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function send(res, row, code = 200) {
  const status =
    row.status === "submitting" &&
    Date.now() - new Date(row.created_at).getTime() > 60000
      ? "unknown"
      : row.status;
  res.set("Cache-Control", "no-store");
  return res
    .status(code)
    .json({ callbackId: row.id, status, createdAt: row.created_at });
}

router.post("/", async (req, res) => {
  if (
    !req.is("application/json") ||
    req.body?.consent !== true ||
    Object.keys(req.body).length !== 1
  )
    return fail(
      res,
      400,
      "Confirm consent to receive one call on your enrolled number",
    );
  const key = req.get("Idempotency-Key") || "";
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(key))
    return fail(res, 400, "A valid Idempotency-Key is required");

  const sql = getSql();
  const farmer = req.user.neon_user_id;
  const find = async () =>
    (
      await sql`SELECT id, status, created_at FROM voice_callbacks
    WHERE farmer_id=${farmer} AND request_key=${key}`
    )[0];
  const existing = await find();
  if (existing) return send(res, existing);
  const config = bolnaConfig();
  if (!config) return fail(res, 503, "Telephone callbacks are unavailable");
  const recipient = config.recipients.get(farmer.toLowerCase());
  if (!recipient)
    return fail(res, 403, "This account is not enrolled in the callback pilot");

  const [row] =
    await sql`INSERT INTO voice_callbacks (id, farmer_id, request_key, daily_slot, status)
    SELECT ${randomUUID()}::uuid, f.neon_user_id, ${key}::text, slot, 'submitting'
    FROM farmers f CROSS JOIN generate_series(1, ${config.dailyLimit}::int) AS slot
    WHERE f.neon_user_id=${farmer} AND NOT EXISTS (SELECT 1 FROM voice_callbacks v
        WHERE v.call_day=(now() AT TIME ZONE 'UTC')::date AND v.daily_slot=slot)
    ORDER BY slot LIMIT 1
    ON CONFLICT DO NOTHING RETURNING id, status, created_at`;
  if (!row) {
    const duplicate = await find();
    if (duplicate) return send(res, duplicate);
    return fail(
      res,
      429,
      "No callback slot available. Check your previous request or try later.",
    );
  }
  const result = await startCallback(config, recipient);
  const [updated] = await sql`UPDATE voice_callbacks
    SET status=${result.status}, execution_id=${result.executionId}, checked_at=now()
    WHERE id=${row.id} RETURNING id, status, created_at`;
  return send(res, updated, 202);
});

router.get("/:id", async (req, res) => {
  if (!uuidPattern.test(req.params.id))
    return fail(res, 404, "Callback not found");
  const sql = getSql();
  const farmer = req.user.neon_user_id;
  const [row] =
    await sql`SELECT id, status, created_at, execution_id FROM voice_callbacks
    WHERE id=${req.params.id} AND farmer_id=${farmer}`;
  if (!row) return fail(res, 404, "Callback not found");
  const config = bolnaConfig();
  if (
    !config ||
    !row.execution_id ||
    !["queued", "in_progress"].includes(row.status)
  )
    return send(res, row);
  const [claimed] = await sql`UPDATE voice_callbacks SET checked_at=now()
    WHERE id=${row.id} AND status=${row.status} AND checked_at < now() - interval '10 seconds'
    RETURNING id`;
  if (!claimed) return send(res, row);
  const status = await callbackStatus(config, row.execution_id).catch(
    () => null,
  );
  if (!status) return send(res, row);
  const [updated] = await sql`UPDATE voice_callbacks SET status=${status}
    WHERE id=${row.id} AND status IN ('queued','in_progress') RETURNING id, status, created_at`;
  return send(res, updated || row);
});

export default router;
