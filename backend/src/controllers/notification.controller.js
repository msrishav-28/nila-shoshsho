import { getSql } from "../lib/db.js";
import {
  classifyWeather,
  shouldStoreWeatherAlert,
} from "../lib/weatherAlert.js";

async function currentConditions(lat, lon) {
  const key = process.env.OPEN_METEO_API_KEY;
  const url = new URL(
    key
      ? "https://customer-api.open-meteo.com/v1/forecast"
      : "https://api.open-meteo.com/v1/forecast",
  );
  url.search = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,wind_speed_10m",
    timezone: "GMT",
  });
  if (key) url.searchParams.set("apikey", key);
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if (!response.ok) return null;
    const { current } = await response.json();
    const temperature = current?.temperature_2m;
    const windspeed = current?.wind_speed_10m;
    const time = current?.time;
    if (
      !Number.isFinite(temperature) ||
      temperature < -100 ||
      temperature > 65 ||
      !Number.isFinite(windspeed) ||
      windspeed < 0 ||
      windspeed > 550 ||
      typeof time !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time)
    )
      return null;
    const asOf = `${time}Z`;
    const timestamp = Date.parse(asOf);
    if (
      !Number.isFinite(timestamp) ||
      Math.abs(Date.now() - timestamp) > 90 * 60_000
    )
      return null;
    return { temperature, windspeed, asOf };
  } catch {
    return null;
  }
}

export const listNotifications = async (req, res) => {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT notification_id, title, body, is_read, created_at
      FROM notifications
      WHERE farmer_id = ${req.user.neon_user_id}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return res.json({ success: true, notifications: rows });
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

export const markNotificationRead = async (req, res) => {
  try {
    const sql = getSql();
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification" });
    }
    const rows = await sql`
      UPDATE notifications
      SET is_read = TRUE
      WHERE notification_id = ${id} AND farmer_id = ${req.user.neon_user_id}
      RETURNING notification_id
    `;
    if (!rows[0]) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }
    return res.json({ success: true });
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

export const ingestWeatherAlert = async (req, res) => {
  try {
    const lat = Number(req.user.lat);
    const lon = Number(req.user.lon);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180 ||
      (!lat && !lon)
    ) {
      return res.status(400).json({
        success: false,
        message: "Add your location in profile to receive weather alerts",
      });
    }

    const conditions = await currentConditions(lat, lon);
    if (!conditions) {
      return res
        .status(502)
        .json({ success: false, message: "Weather service is unavailable" });
    }

    const classified = classifyWeather(conditions);
    if (shouldStoreWeatherAlert(classified.kind)) {
      const farmerId = req.user.neon_user_id;
      // Requests for the same farmer serialize before the second statement takes its snapshot.
      const sql = getSql();
      await sql.transaction(
        (tx) => [
          tx`SELECT neon_user_id FROM farmers WHERE neon_user_id = ${farmerId} FOR UPDATE`,
          tx`INSERT INTO notifications (farmer_id, title, body)
           SELECT ${farmerId}::uuid, ${classified.title}, ${classified.body}
           WHERE NOT EXISTS (
             SELECT 1 FROM notifications
             WHERE farmer_id = ${farmerId} AND title = ${classified.title}
               AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'
           )`,
        ],
        { isolationLevel: "ReadCommitted" },
      );
    }
    return res.json({
      success: true,
      title: classified.title,
      body: classified.body,
      kind: classified.kind,
      source: "Open-Meteo",
      asOf: conditions.asOf,
    });
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
