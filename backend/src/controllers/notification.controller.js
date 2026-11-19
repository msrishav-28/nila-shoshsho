import { getSql } from "../lib/db.js";
import {
  classifyWeather,
  shouldStoreWeatherAlert,
} from "../lib/weatherAlert.js";

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

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) {
      return res
        .status(502)
        .json({ success: false, message: "Weather service is unavailable" });
    }
    const data = await response.json();
    const temperature = data.current_weather?.temperature;
    const windspeed = data.current_weather?.windspeed;
    if (!Number.isFinite(temperature) || !Number.isFinite(windspeed)) {
      return res
        .status(502)
        .json({ success: false, message: "Weather service is unavailable" });
    }

    const classified = classifyWeather({
      temperature,
      windspeed,
    });
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
      asOf: data.current_weather?.time ? `${data.current_weather.time}Z` : null,
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
