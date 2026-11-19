from datetime import datetime, timedelta, timezone
import math
import requests
from app.deadline import provider_timeout

from app.mandi import fetch_mandi_page
from app.cache import cached_data

TIMEOUT = 20


def indian_season(month=None):
    month = int(month or datetime.now(timezone(timedelta(hours=5, minutes=30))).month)
    if 6 <= month <= 9:
        return "Kharif"
    if month >= 10 or month <= 2:
        return "Rabi"
    return "Zaid"


def fetch_daily_weather(lat, lon):
    return cached_data(
        "daily-weather", [lat, lon], lambda: _daily_weather(lat, lon), 900
    )


def _daily_weather(lat, lon):
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "daily": (
                    "temperature_2m_max,temperature_2m_min,precipitation_sum,"
                    "wind_speed_10m_max,relative_humidity_2m_max,"
                    "relative_humidity_2m_min,et0_fao_evapotranspiration"
                ),
                "forecast_days": 7,
                "timezone": "auto",
            },
            timeout=provider_timeout(TIMEOUT),
        )
        response.raise_for_status()
        payload = response.json()
        daily = payload.get("daily") if isinstance(payload, dict) else None
        if not isinstance(daily, dict):
            return None
    except (requests.RequestException, ValueError, TypeError):
        return None
    dates = daily.get("time") or []
    if not dates:
        return None
    fields = (
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "wind_speed_10m_max",
        "relative_humidity_2m_max",
        "relative_humidity_2m_min",
        "et0_fao_evapotranspiration",
    )
    if not isinstance(dates, list) or len(dates) > 7:
        return None
    for field in fields:
        values = daily.get(field)
        if not isinstance(values, list) or len(values) != len(dates):
            return None
        if any(
            value is not None
            and (type(value) not in (int, float) or not math.isfinite(value))
            for value in values
        ):
            return None
    return {
        "dates": dates,
        "temp_max": daily.get("temperature_2m_max") or [],
        "temp_min": daily.get("temperature_2m_min") or [],
        "humidity_max": daily.get("relative_humidity_2m_max") or [],
        "humidity_min": daily.get("relative_humidity_2m_min") or [],
        "precipitation": daily.get("precipitation_sum") or [],
        "wind_speed_max": daily.get("wind_speed_10m_max") or [],
        "evapotranspiration": daily.get("et0_fao_evapotranspiration") or [],
        "source": "Open-Meteo",
        "asOf": dates[0],
    }


def fetch_current_weather(lat, lon):
    return cached_data(
        "current-weather", [lat, lon], lambda: _current_weather(lat, lon), 300
    )


def _current_weather(lat, lon):
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
            },
            timeout=provider_timeout(TIMEOUT),
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError, TypeError):
        return None
    current = payload.get("current") if isinstance(payload, dict) else None
    if not isinstance(current, dict) or type(current.get("temperature_2m")) not in (
        int,
        float,
    ):
        return None
    for field in (
        "temperature_2m",
        "relative_humidity_2m",
        "precipitation",
        "wind_speed_10m",
    ):
        value = current.get(field)
        if value is not None and (
            type(value) not in (int, float) or not math.isfinite(value)
        ):
            return None
    return {
        "temperature": current["temperature_2m"],
        "humidity": current.get("relative_humidity_2m"),
        "precipitation": current.get("precipitation"),
        "windspeed": current.get("wind_speed_10m"),
        "source": "Open-Meteo",
        "asOf": current.get("time"),
    }


def reverse_state(lat, lon):
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json"},
            headers={"User-Agent": "NilaShoshsho/1.0 (farmer-companion)"},
            timeout=provider_timeout(TIMEOUT),
        )
        response.raise_for_status()
        address = (response.json() or {}).get("address") or {}
    except (requests.RequestException, ValueError, TypeError):
        return ""
    return address.get("state") or ""


def live_facts(question, profile):
    text = (question or "").lower()
    chunks = []
    sources = []
    state = (profile or {}).get("state") or ""
    lat = (profile or {}).get("lat") or 0
    lon = (profile or {}).get("lon") or 0
    if state and any(word in text for word in ("price", "mandi", "rate", "sell")):
        records = fetch_mandi_page(state=state, limit=8)["records"]
        if records:
            chunks.append(f"Mandi records: {records[:8]}")
            sources.extend(
                {"source": "AGMARKNET via data.gov.in", "asOf": day}
                for day in sorted({r["asOf"] for r in records})
            )
    if any(word in text for word in ("weather", "rain", "temperature", "heat", "cold")):
        if lat and lon:
            from app.imd import fetch_imd_forecast, fetch_imd_warnings

            imd = fetch_imd_forecast(lat, lon)
            if imd:
                chunks.append(f"IMD forecast: {imd}")
                sources.append({"source": imd["source"], "asOf": imd.get("asOf")})
            warnings = fetch_imd_warnings(state)
            if warnings:
                chunks.append(f"IMD warnings: {warnings}")
                sources.append(
                    {"source": warnings["source"], "asOf": warnings.get("asOf")}
                )
            weather = fetch_current_weather(lat, lon)
            if weather:
                chunks.append(f"Open-Meteo now: {weather}")
                sources.append(
                    {"source": weather["source"], "asOf": weather.get("asOf")}
                )
    return "\n".join(chunks), sources
