import { sendWeatherAlerts } from "../lib/twilio.js";

export const getWeatherForecast = async (req, res) => {
  try {
    const { latitude, longitude, phone } = req.query;

    if (!latitude || !longitude || !phone) {
      return res.status(400).json({ error: 'Latitude, longitude, and phone number are required' });
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );

    const data = await response.json(); 
    const { temperature, windspeed } = data.current_weather;
    const alerts = [];

    // Alert conditions
    if (temperature >= 40) {
      alerts.push("🔥 Heatwave Alert: High temperature");
    } else if (temperature <= 5) {
      alerts.push("❄️ Cold Alert: Low temperature");
    } else if (windspeed >= 50) {
      alerts.push("💨 Wind Alert: High wind speed");
    } else {
      alerts.push("🌤️ Normal Weather: Conditions are normal");
    }

    if (alerts.length > 0) {
      const message = `🌾 Weather Alert:\n${alerts.join('\n')}`;
      await sendWeatherAlerts({ to: phone, message });
    }

    res.status(200).json({ ...data, alerts });
  } catch (error) {
    console.error("❌ Weather fetch error:", error.message);
    res.status(500).json({ error: 'Weather fetch failed' });
  }
};
