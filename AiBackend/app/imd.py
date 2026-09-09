import os
from datetime import datetime, timezone
import requests

TIMEOUT = 15
FORECAST_URL = "https://api.imd.gov.in/api/v1/cityforecastloc"
WARNINGS_URL = "https://api.imd.gov.in/api/v1/warnings"


def _headers():
    headers = {"Accept": "application/json", "User-Agent": "NilaShoshsho/1.0"}
    key = os.getenv("IMD_API_KEY")
    if key:
        headers["X-API-Key"] = key
        headers["Authorization"] = f"Bearer {key}"
    return headers


def fetch_imd_forecast(lat, lon):
    try:
        response = requests.get(
            FORECAST_URL,
            params={"lat": lat, "lon": lon},
            headers=_headers(),
            timeout=TIMEOUT,
        )
        if response.status_code != 200:
            return None
        payload = response.json()
    except (requests.RequestException, ValueError, TypeError):
        return None
    if not payload:
        return None
    row = payload[0] if isinstance(payload, list) else payload
    if not isinstance(row, dict):
        return None
    return {
        "station": row.get("Station_Name") or row.get("Station") or "",
        "today_forecast": row.get("Todays_Forecast") or "",
        "max_temp": row.get("Todays_Forecast_Max_Temp") or row.get("Today_Max_temp"),
        "min_temp": row.get("Todays_Forecast_Min_temp") or row.get("Today_Min_temp"),
        "rainfall_24h": row.get("Past_24_hrs_Rainfall"),
        "source": "IMD",
        "asOf": row.get("Date") or datetime.now(timezone.utc).date().isoformat(),
        "raw": {k: row.get(k) for k in ("Day_2_Forecast", "Day_3_Forecast") if row.get(k)},
    }


def fetch_imd_warnings():
    try:
        response = requests.get(WARNINGS_URL, headers=_headers(), timeout=TIMEOUT)
        if response.status_code != 200:
            return None
        payload = response.json()
    except (requests.RequestException, ValueError, TypeError):
        return None
    if payload in (None, "", [], {}):
        return None
    return {
        "warnings": payload,
        "source": "IMD",
        "asOf": datetime.now(timezone.utc).isoformat(),
    }
