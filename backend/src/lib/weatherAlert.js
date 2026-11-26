export const STORED_ALERT_KINDS = new Set(["heat", "cold", "wind"]);

export function classifyWeather({ temperature, windspeed }) {
  if (temperature >= 40) {
    return {
      kind: "heat",
      title: "Heat alert",
      body: `High model temperature of ${temperature}°C. Check local heat advisories and protect workers.`,
    };
  }
  if (temperature <= 5) {
    return {
      kind: "cold",
      title: "Cold alert",
      body: `Low temperature of ${temperature}°C. Watch sensitive crops.`,
    };
  }
  if (windspeed >= 50) {
    return {
      kind: "wind",
      title: "Wind alert",
      body: `High wind speed of ${windspeed} km/h.`,
    };
  }
  return {
    kind: "update",
    title: "Weather update",
    body: `Current temperature is ${temperature}°C.`,
  };
}

export function shouldStoreWeatherAlert(kind) {
  return STORED_ALERT_KINDS.has(kind);
}
