import { getSql } from "../lib/db.js";

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
    const crop = String(req.body.crop || "").trim();
    const quantityKg = Number(req.body.quantityKg);
    const pickupCity = String(req.body.pickupCity || req.user.city || "").trim();
    const pickupState = String(req.body.pickupState || req.user.state || "").trim();
    if (!crop || !Number.isFinite(quantityKg) || quantityKg <= 0) {
      return res.status(400).json({
        success: false,
        message: "crop and a positive quantityKg are required",
      });
    }
    const sql = getSql();
    const rows = await sql`
      INSERT INTO logistics_jobs (farmer_id, crop, quantity_kg, pickup_city, pickup_state)
      VALUES (${req.user.neon_user_id}, ${crop}, ${quantityKg}, ${pickupCity}, ${pickupState})
      RETURNING *
    `;
    return res.status(201).json({ success: true, job: toJob(rows[0]) });
  } catch (err) {
    console.error("createJob", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const listJobs = async (req, res) => {
  try {
    const sql = getSql();
    const role = req.user.role;
    const rows =
      role === "Logistics"
        ? await sql`
            SELECT * FROM logistics_jobs
            WHERE status = 'OPEN' OR accepted_by = ${req.user.neon_user_id}
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
    console.error("listJobs", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const acceptJob = async (req, res) => {
  try {
    if (req.user.role !== "Logistics") {
      return res.status(403).json({ success: false, message: "Logistics role required" });
    }
    const jobId = Number(req.params.id);
    if (!Number.isFinite(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job" });
    }
    const sql = getSql();
    const rows = await sql`
      UPDATE logistics_jobs
      SET status = 'ACCEPTED',
          accepted_by = ${req.user.neon_user_id},
          updated_at = now()
      WHERE job_id = ${jobId} AND status = 'OPEN'
      RETURNING *
    `;
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "Job not open" });
    }
    return res.json({ success: true, job: toJob(rows[0]) });
  } catch (err) {
    console.error("acceptJob", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const cancelJob = async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    if (!Number.isFinite(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job" });
    }
    const sql = getSql();
    const rows = await sql`
      UPDATE logistics_jobs
      SET status = 'CANCELED', updated_at = now()
      WHERE job_id = ${jobId}
        AND farmer_id = ${req.user.neon_user_id}
        AND status = 'OPEN'
      RETURNING *
    `;
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.json({ success: true, job: toJob(rows[0]) });
  } catch (err) {
    console.error("cancelJob", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const completeJob = async (req, res) => {
  try {
    if (req.user.role !== "Logistics") {
      return res.status(403).json({ success: false, message: "Logistics role required" });
    }
    const jobId = Number(req.params.id);
    if (!Number.isFinite(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job" });
    }
    const sql = getSql();
    const rows = await sql`
      UPDATE logistics_jobs
      SET status = 'DONE', updated_at = now()
      WHERE job_id = ${jobId}
        AND status = 'ACCEPTED'
        AND accepted_by = ${req.user.neon_user_id}
      RETURNING *
    `;
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.json({ success: true, job: toJob(rows[0]) });
  } catch (err) {
    console.error("completeJob", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
