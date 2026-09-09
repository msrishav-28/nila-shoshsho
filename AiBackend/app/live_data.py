import os
import re
from datetime import datetime
import requests

TIMEOUT = 20
DATA_GOV_URL = (
    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
)
FILTER_RE = re.compile(r"^[\w\s().'\-/]+$")
COMMODITY_ALIASES = {
    "paddy": "Paddy(Dhan)(Common)",
    "dhan": "Paddy(Dhan)(Common)",
    "rice": "Rice",
    "wheat": "Wheat",
    "onion": "Onion",
    "pyaz": "Onion",
    "tomato": "Tomato",
    "potato": "Potato",
    "maize": "Maize",
    "cotton": "Cotton",
    "soybean": "Soyabean",
    "soyabean": "Soyabean",
    "groundnut": "Groundnut",
}


def indian_season(month=None):
    month = int(month or datetime.now().month)
    if 6 <= month <= 9:
        return "Kharif"
    if month >= 10 or month <= 2:
        return "Rabi"
    return "Zaid"


def _clean(value):
    text = str(value or "").strip()
    if not text or len(text) > 80 or not FILTER_RE.match(text):
        return None
    return text


def fetch_mandi_records(commodity=None, state=None, limit=10):
    api_key = os.getenv("DATA_GOV_API_KEY")
    if not api_key:
        return None
    params = {
        "api-key": api_key,
        "format": "json",
        "offset": 0,
        "limit": max(1, min(int(limit or 10), 50)),
    }
    raw_commodity = (commodity or "").strip().lower()
    commodity = _clean(COMMODITY_ALIASES.get(raw_commodity, commodity))
    state = _clean(state)
    if commodity:
        params["filters[commodity]"] = commodity
    if state:
        params["filters[state]"] = state
    try:
        response = requests.get(DATA_GOV_URL, params=params, timeout=TIMEOUT)
        if response.status_code != 200:
            return []
        raw = response.json().get("records") or []
    except (requests.RequestException, ValueError, TypeError):
        return []
    records = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        records.append(
            {
                "commodity": row.get("commodity"),
                "variety": row.get("variety"),
                "market": row.get("market"),
                "district": row.get("district"),
                "state": row.get("state"),
                "arrival_date": row.get("arrival_date"),
                "min_price": row.get("min_price"),
                "max_price": row.get("max_price"),
                "modal_price": row.get("modal_price"),
                "unit": "Rs/quintal",
                "source": "AGMARKNET via data.gov.in",
                "asOf": row.get("arrival_date") or "",
            }
        )
    return records


def fetch_daily_weather(lat, lon):
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "daily": (
                    "temperature_2m_max,temperature_2m_min,precipitation_sum,"
                    "wind_speed_10m_max,relative_humidity_2m_max,"
                    "relative_humidity_2m_min,evapotranspiration"
                ),
                "forecast_days": 7,
                "timezone": "auto",
            },
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        daily = response.json().get("daily") or {}
    except (requests.RequestException, ValueError, TypeError):
        return None
    dates = daily.get("time") or []
    if not dates:
        return None
    return {
        "dates": dates,
        "temp_max": daily.get("temperature_2m_max") or [],
        "temp_min": daily.get("temperature_2m_min") or [],
        "humidity_max": daily.get("relative_humidity_2m_max") or [],
        "humidity_min": daily.get("relative_humidity_2m_min") or [],
        "precipitation": daily.get("precipitation_sum") or [],
        "wind_speed_max": daily.get("wind_speed_10m_max") or [],
        "evapotranspiration": daily.get("evapotranspiration") or [],
        "source": "Open-Meteo",
        "asOf": dates[0],
    }


def fetch_current_weather(lat, lon):
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current_weather": True,
                "hourly": "relativehumidity_2m,precipitation",
            },
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError, TypeError):
        return None
    current = payload.get("current_weather") or {}
    if current.get("temperature") is None:
        return None
    hourly = payload.get("hourly") or {}
    humidity = (hourly.get("relativehumidity_2m") or [None])[0]
    rain = (hourly.get("precipitation") or [None])[0]
    return {
        "temperature": current.get("temperature"),
        "humidity": humidity,
        "precipitation": rain,
        "windspeed": current.get("windspeed"),
        "source": "Open-Meteo",
    }


def reverse_state(lat, lon):
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json"},
            headers={"User-Agent": "NilaShoshsho/1.0 (farmer-companion)"},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        address = (response.json() or {}).get("address") or {}
    except (requests.RequestException, ValueError, TypeError):
        return ""
    return address.get("state") or ""


def live_facts(question, profile):
    text = (question or "").lower()
    chunks = []
    state = (profile or {}).get("state") or ""
    lat = (profile or {}).get("lat") or 0
    lon = (profile or {}).get("lon") or 0
    if state and any(word in text for word in ("price", "mandi", "rate", "sell")):
        records = fetch_mandi_records(state=state, limit=8) or []
        if records:
            chunks.append(f"Mandi records: {records[:8]}")
    if any(word in text for word in ("weather", "rain", "temperature", "heat", "cold")):
        if lat and lon:
            from app.imd import fetch_imd_forecast, fetch_imd_warnings

            imd = fetch_imd_forecast(lat, lon)
            if imd:
                chunks.append(f"IMD forecast: {imd}")
            warnings = fetch_imd_warnings()
            if warnings:
                chunks.append(f"IMD warnings: {warnings}")
            weather = fetch_current_weather(lat, lon)
            if weather:
                chunks.append(f"Open-Meteo now: {weather}")
    return "\n".join(chunks)
