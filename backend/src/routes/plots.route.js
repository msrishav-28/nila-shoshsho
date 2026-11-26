import { createHash } from "node:crypto";
import express from "express";
import { getSql } from "../lib/db.js";
import { protectRoute, requireFarmer } from "../middleware/auth.middleware.js";

const router = express.Router();
const limit = 100;
const plotIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const fields = ["crop", "lat", "lon", "areaAcres", "sowingDate"];

function dateIsValid(value) {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(value + "T00:00:00Z");
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}

function parsePlot(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (
    !keys.length ||
    (!partial && keys.length !== fields.length) ||
    keys.some((field) => !fields.includes(field))
  )
    return null;
  const result = {};
  for (const field of fields) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (field === "crop") {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 120 ||
        value.includes("\u0000")
      )
        return null;
      result.crop = value.trim();
    } else if (field === "sowingDate") {
      if (!dateIsValid(value)) return null;
      result.sowingDate = value;
    } else {
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      if (field === "lat" && Math.abs(value) > 90) return null;
      if (field === "lon" && Math.abs(value) > 180) return null;
      if (field === "areaAcres" && (value <= 0 || value > 100000)) return null;
      result[field] = value;
    }
  }
  return result;
}

function toPlot(row) {
  return {
    plotId: row.plot_id,
    crop: row.crop,
    lat: row.lat,
    lon: row.lon,
    areaAcres: Number(row.area_acres),
    sowingDate: row.sowing_day,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

router.use(protectRoute, requireFarmer, (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

router.get("/", async (req, res) => {
  const plots =
    await getSql()`SELECT *, to_char(sowing_date, 'YYYY-MM-DD') AS sowing_day FROM farm_plots
    WHERE farmer_id=${req.user.neon_user_id} ORDER BY created_at DESC, plot_id LIMIT ${limit}`;
  return res.json({ success: true, plots: plots.map(toPlot) });
});

router.post("/", async (req, res) => {
  const body = req.is("application/json") && parsePlot(req.body);
  const requestKey = req.get("Idempotency-Key") || "";
  if (!body || !/^[A-Za-z0-9_-]{8,100}$/.test(requestKey))
    return fail(res, 400, "Provide valid plot fields and an Idempotency-Key");
  const owner = req.user.neon_user_id;
  const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const [, [row]] = await getSql().transaction(
    (tx) => [
      tx`SELECT neon_user_id FROM farmers WHERE neon_user_id=${owner} FOR UPDATE`,
      tx`INSERT INTO farm_plots (farmer_id,crop,lat,lon,area_acres,sowing_date,request_key,request_hash)
      SELECT ${owner}::uuid,${body.crop}::text,${body.lat}::double precision,${body.lon}::double precision,
        ${body.areaAcres}::numeric,${body.sowingDate}::date,${requestKey}::text,${hash}::char(64)
      WHERE (SELECT count(*) FROM farm_plots WHERE farmer_id=${owner}) < ${limit}
        OR EXISTS (SELECT 1 FROM farm_plots WHERE farmer_id=${owner} AND request_key=${requestKey})
      ON CONFLICT (farmer_id,request_key) DO UPDATE SET request_key=excluded.request_key
      WHERE farm_plots.request_hash=excluded.request_hash
      RETURNING *, to_char(sowing_date, 'YYYY-MM-DD') AS sowing_day`,
    ],
    { isolationLevel: "ReadCommitted" },
  );
  if (!row)
    return fail(res, 409, "Plot allowance reached or request key already used");
  return res.status(201).json({ success: true, plot: toPlot(row) });
});

router.patch("/:plotId", async (req, res) => {
  if (!plotIdPattern.test(req.params.plotId))
    return fail(res, 404, "Plot not found");
  const body = req.is("application/json") && parsePlot(req.body, true);
  if (!body) return fail(res, 400, "Supply valid fields to update");
  const [row] = await getSql()`UPDATE farm_plots
    SET crop=coalesce(${body.crop ?? null},crop),
        lat=coalesce(${body.lat ?? null},lat), lon=coalesce(${body.lon ?? null},lon),
        area_acres=coalesce(${body.areaAcres ?? null},area_acres),
        sowing_date=coalesce(${body.sowingDate ?? null}::date,sowing_date), updated_at=now()
    WHERE plot_id=${req.params.plotId} AND farmer_id=${req.user.neon_user_id}
    RETURNING *, to_char(sowing_date, 'YYYY-MM-DD') AS sowing_day`;
  if (!row) return fail(res, 404, "Plot not found");
  return res.json({ success: true, plot: toPlot(row) });
});

router.delete("/:plotId", async (req, res) => {
  if (!plotIdPattern.test(req.params.plotId))
    return fail(res, 404, "Plot not found");
  const [row] = await getSql()`DELETE FROM farm_plots
    WHERE plot_id=${req.params.plotId} AND farmer_id=${req.user.neon_user_id} RETURNING plot_id`;
  if (!row) return fail(res, 404, "Plot not found");
  return res.json({ success: true });
});

export default router;
