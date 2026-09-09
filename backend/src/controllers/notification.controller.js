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
    console.error("listNotifications", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const sql = getSql();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "Invalid notification" });
    }
    const rows = await sql`
      UPDATE notifications
      SET is_read = TRUE
      WHERE notification_id = ${id} AND farmer_id = ${req.user.neon_user_id}
      RETURNING notification_id
    `;
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("markNotificationRead", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export async function createNotification(farmerId, title, body) {
  const sql = getSql();
  await sql`
    INSERT INTO notifications (farmer_id, title, body)
    VALUES (${farmerId}, ${title}, ${body})
  `;
}

export const ingestWeatherAlert = async (req, res) => {
  try {
    const lat = Number(req.user.lat);
    const lon = Number(req.user.lon);
    if (!lat && !lon) {
      return res.status(400).json({
        success: false,
        message: "Add your location in profile to receive weather alerts",
      });
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    if (!response.ok) {
      return res.status(502).json({ success: false, message: "Weather service is unavailable" });
    }
    const data = await response.json();
    const temperature = data.current_weather?.temperature;
    const windspeed = data.current_weather?.windspeed;
    if (temperature === undefined) {
      return res.status(502).json({ success: false, message: "Weather service is unavailable" });
    }

    const classified = classifyWeather({
      temperature,
      windspeed: Number(windspeed) || 0,
    });
    if (shouldStoreWeatherAlert(classified.kind)) {
      const existing = await getSql()`
        SELECT notification_id
        FROM notifications
        WHERE farmer_id = ${req.user.neon_user_id}
          AND title = ${classified.title}
          AND created_at >= date_trunc('day', timezone('utc', now()))
        LIMIT 1
      `;
      if (!existing[0]) {
        await createNotification(
          req.user.neon_user_id,
          classified.title,
          classified.body
        );
      }
    }
    return res.json({
      success: true,
      title: classified.title,
      body: classified.body,
      kind: classified.kind,
      source: "Open-Meteo",
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    console.error("ingestWeatherAlert", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
