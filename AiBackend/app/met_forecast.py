from datetime import datetime, timedelta, timezone
from math import isfinite
import os

import requests

from app.cache import cached_data
from app.deadline import provider_timeout
from app.logging_config import log_failure


URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
ATTRIBUTION = "https://api.met.no/weatherapi/locationforecast/2.0/documentation"
LICENSE = "https://creativecommons.org/licenses/by/4.0/"
CACHE_SECONDS = 21600


def _timestamp(value):
    if not isinstance(value, str) or len(value) > 35:
        raise ValueError("Invalid forecast timestamp")
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("Forecast timestamp lacks timezone")
    return result.astimezone(timezone.utc)


def _number(value, minimum, maximum):
    if type(value) in (int, float) and minimum <= value <= maximum and isfinite(value):
        return value
    return None


def _load(lat, lon):
    try:
        response = requests.get(
            URL,
            params={"lat": lat, "lon": lon},
            headers={
                "User-Agent": "NilaShoshsho/1.0 github.com/msrishav-28/nila-shoshsho",
                "Accept": "application/json",
            },
            timeout=provider_timeout(6),
            allow_redirects=False,
        )
        response.raise_for_status()
        if response.status_code != 200:
            log_failure(
                "met_norway", ValueError("Unsupported response"), response.status_code
            )
            return None
        payload = response.json()["properties"]
        issued_at = _timestamp(payload["meta"]["updated_at"])
        now = datetime.now(timezone.utc)
        if not now - timedelta(hours=18) <= issued_at <= now + timedelta(minutes=15):
            return None
        series = payload["timeseries"]
        if not isinstance(series, list) or len(series) > 300:
            return None
        points = []
        for point in series[:32]:
            valid_at = _timestamp(point["time"])
            details = point["data"]["instant"]["details"]
            temp = _number(details.get("air_temperature"), -100, 65)
            if temp is None or not now - timedelta(
                hours=2
            ) <= valid_at <= now + timedelta(hours=9):
                continue
            wind = _number(details.get("wind_speed"), 0, 150)
            points.append(
                {
                    "temperature": temp,
                    "humidity": _number(details.get("relative_humidity"), 0, 100),
                    "windspeed": round(wind * 3.6, 1) if wind is not None else None,
                    "asOf": valid_at.isoformat(),
                }
            )
        return {"issuedAt": issued_at.isoformat(), "points": points} if points else None
    except requests.HTTPError as error:
        status = error.response.status_code if error.response is not None else None
        log_failure("met_norway", error, status)
    except (
        requests.RequestException,
        KeyError,
        AttributeError,
        ValueError,
        TypeError,
        OverflowError,
    ) as error:
        log_failure("met_norway", error)
    return None


def near_term_forecast(lat, lon):
    if os.getenv("MET_FORECAST_ENABLED", "").lower() != "true":
        return None
    lat, lon = round(lat, 2), round(lon, 2)
    result = cached_data(
        "met-forecast",
        [lat, lon],
        lambda: _load(lat, lon),
        CACHE_SECONDS,
        reserve_refresh=True,
    )
    if not result:
        return None
    now = datetime.now(timezone.utc)
    point = min(
        result["points"], key=lambda entry: abs(_timestamp(entry["asOf"]) - now)
    )
    if abs(_timestamp(point["asOf"]) - now) > timedelta(minutes=90):
        return None
    return {
        **point,
        "precipitation": None,
        "kind": "forecast",
        "source": "MET Norway forecast",
        "sourceUrl": ATTRIBUTION,
        "licenseUrl": LICENSE,
        "issuedAt": result["issuedAt"],
    }
