import { getSql } from "../lib/db.js";
import { createHash } from "node:crypto";

function toJob(row) {
  return {
    id: row.job_id,
    farmerId: row.farmer_id,
    crop: row.crop,
    quantityKg: Number(row.quantity_kg),
    pickupCity: row.pickup_city,
    pickupState: row.pickup_state,
    status: row.status,
    acceptedBy: row.accepted_by,
    createdAt: row.created_at,
  };
}

export const createJob = async (req, res) => {
  try {
    if (
      typeof req.body.crop !== "string" ||
      typeof req.body.quantityKg !== "number" ||
      [req.body.pickupCity, req.body.pickupState].some(
        (value) => value !== undefined && typeof value !== "string",
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide crop, numeric quantity and pickup text",
      });
    }
    const crop = String(req.body.crop || "").trim();
    const quantityKg = Number(req.body.quantityKg);
    const pickupCity = String(
      req.body.pickupCity || req.user.city || "",
    ).trim();
    const pickupState = String(
      req.body.pickupState || req.user.state || "",
    ).trim();
    if (
      !crop ||
      crop.length > 120 ||
      pickupCity.length > 120 ||
      pickupState.length > 120 ||
      !Number.isFinite(quantityKg) ||
      quantityKg <= 0 ||
      quantityKg > 1000000
    ) {
      return res.status(400).json({
        success: false,
        message: "crop and a positive quantityKg are required",
      });
    }
    const sql = getSql();
    const requestKey = req.get("Idempotency-Key") || null;
    if (requestKey !== null && !/^[A-Za-z0-9_-]{8,100}$/.test(requestKey)) {
      return res.status(400).json({
        success: false,
        message: "Use an 8–100 character Idempotency-Key",
      });
    }
    const requestHash = createHash("sha256")
      .update(JSON.stringify([crop, quantityKg, pickupCity, pickupState]))
      .digest("hex");
    const rows = await sql`
      INSERT INTO logistics_jobs (farmer_id, crop, quantity_kg, pickup_city, pickup_state, idempotency_key, request_hash)
      VALUES (${req.user.neon_user_id}, ${crop}, ${quantityKg}, ${pickupCity}, ${pickupState}, ${requestKey}, ${requestHash})
      ON CONFLICT (farmer_id, idempotency_key) WHERE idempotency_key IS NOT NULL
      DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key
      WHERE logistics_jobs.request_hash=EXCLUDED.request_hash
      RETURNING *
    `;
    if (!rows.length)
      return res.status(409).json({
        success: false,
        message: "Idempotency-Key was already used for a different request",
      });
    return res.status(201).json({ success: true, job: toJob(rows[0]) });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const listJobs = async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "Logistics" && !req.user.carrier_approved) {
      return res
        .status(403)
        .json({ success: false, message: "Carrier approval required" });
    }
    const sql = getSql();
    const rows =
      role === "Logistics"
        ? await sql`
            SELECT * FROM logistics_jobs
            WHERE (status = 'OPEN' OR accepted_by = ${req.user.neon_user_id})
              AND EXISTS (SELECT 1 FROM account_reviews WHERE farmer_id = ${req.user.neon_user_id}
                AND kind = 'carrier' AND approved)
            ORDER BY created_at DESC
            LIMIT 100
          `
        : await sql`
            SELECT * FROM logistics_jobs
            WHERE farmer_id = ${req.user.neon_user_id}
            ORDER BY created_at DESC
            LIMIT 100
          `;
    return res.json({ success: true, jobs: rows.map(toJob) });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const acceptJob = async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    if (!Number.isSafeInteger(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid job" });
    }
    const sql = getSql();
    const rows = await sql`
      UPDATE logistics_jobs
      SET status = 'ACCEPTED',
          accepted_by = ${req.user.neon_user_id},
          updated_at = now()
      WHERE job_id = ${jobId}
        AND (status = 'OPEN' OR (status = 'ACCEPTED' AND accepted_by = ${req.user.neon_user_id}))
        AND EXISTS (SELECT 1 FROM account_reviews WHERE farmer_id = ${req.user.neon_user_id} AND kind = 'carrier' AND approved)
        AND farmer_id <> ${req.user.neon_user_id}
      RETURNING *
    `;
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "Job not open" });
    }
    return res.json({ success: true, job: toJob(rows[0]) });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const cancelJob = async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    if (!Number.isSafeInteger(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid job" });
    }
    const sql = getSql();
    const rows = await sql`
      UPDATE logistics_jobs
      SET status = 'CANCELED', updated_at = now()
      WHERE job_id = ${jobId}
        AND farmer_id = ${req.user.neon_user_id}
        AND status IN ('OPEN', 'CANCELED')
      RETURNING *
    `;
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.json({ success: true, job: toJob(rows[0]) });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const completeJob = async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    if (!Number.isSafeInteger(jobId) || jobId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid job" });
    }
    const sql = getSql();
    const rows = await sql`
      UPDATE logistics_jobs
      SET status = 'DONE', updated_at = now()
      WHERE job_id = ${jobId}
        AND status IN ('ACCEPTED', 'DONE')
        AND accepted_by = ${req.user.neon_user_id}
        AND EXISTS (SELECT 1 FROM account_reviews WHERE farmer_id = ${req.user.neon_user_id} AND kind = 'carrier' AND approved)
      RETURNING *
    `;
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.json({ success: true, job: toJob(rows[0]) });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "request_failure",
        requestId: res.getHeader("X-Request-ID"),
        errorClass: err?.constructor?.name || "Error",
      }),
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
