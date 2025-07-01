// Utility to fetch weather data from Open-Meteo API (no API key required)
// Usage: getWeatherByCoords(lat, lon)

// Open-Meteo docs: https://open-meteo.com/en/docs
// Nominatim docs: https://nominatim.org/release-docs/develop/api/Reverse/

export async function getWeatherByCoords(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch weather');
  return res.json();
}

export async function getCityName(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'AgriApp/1.0 (your@email.com)'
    }
  });
  if (!res.ok) throw new Error('Failed to fetch city');
  const data = await res.json();
  // Try to get city, town, or village name
  return data.address.city || data.address.town || data.address.village || data.address.state_district || data.address.state || '';
}
