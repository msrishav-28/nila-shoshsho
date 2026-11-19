import math
import os
import re

import requests
from app.deadline import provider_timeout
from app.cache import cached_data


DATA_GOV_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
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


SOURCE = "AGMARKNET via data.gov.in"


class MarketError(Exception):
    def __init__(self, message, status):
        super().__init__(message)
        self.status = status


def normalize_record(row, source):
    if not isinstance(row, dict):
        raise ValueError("Invalid market record")
    fields = (
        "state",
        "district",
        "market",
        "commodity",
        "variety",
        "grade",
        "arrival_date",
        "min_price",
        "max_price",
        "modal_price",
    )
    record = {field: row.get(field) for field in fields}
    if not all(
        value is None or isinstance(value, (str, int, float))
        for value in record.values()
    ):
        raise ValueError("Invalid market field")
    for field in (
        "state",
        "district",
        "market",
        "commodity",
        "variety",
        "grade",
        "arrival_date",
    ):
        value = record[field]
        if value is not None and (not isinstance(value, str) or len(value) > 160):
            raise ValueError("Invalid market identity")
    for field in ("min_price", "max_price", "modal_price"):
        value = record[field]
        if value not in (None, ""):
            price = float(value)
            if isinstance(value, bool) or not math.isfinite(price) or price < 0:
                raise ValueError("Invalid price")
    record.update(
        unit=row.get("unit") or "Rs/quintal",
        source=source,
        asOf=row.get("arrival_date") or "",
    )
    if not isinstance(record["unit"], str):
        raise ValueError("Invalid market unit")
    return record


def fetch_mandi_page(commodity=None, state=None, district=None, limit=10, offset=0):
    key = os.getenv("DATA_GOV_API_KEY")
    if not key:
        raise MarketError("Market price service is not configured", 503)
    params = {"api-key": key, "format": "json", "offset": offset, "limit": limit}
    for name, value in (
        ("commodity", commodity),
        ("state", state),
        ("district", district),
    ):
        if value in (None, ""):
            continue
        if (
            not isinstance(value, str)
            or len(value) > 80
            or not FILTER_RE.fullmatch(value.strip())
        ):
            raise MarketError("Invalid market filter", 400)
        value = value.strip()
        if name == "commodity":
            value = COMMODITY_ALIASES.get(value.lower(), value)
        params[f"filters[{name}]"] = value
    filters = {name: value for name, value in params.items() if name != "api-key"}
    return cached_data("mandi", filters, lambda: _load_page(params), 3600)


def _load_page(params):
    try:
        response = requests.get(
            DATA_GOV_URL, params=params, timeout=provider_timeout(20)
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or not isinstance(
            payload.get("records"), list
        ):
            raise ValueError("Missing market records")
        records = [normalize_record(row, SOURCE) for row in payload["records"]]
        return {
            "records": records,
            "source": SOURCE,
            "total": payload.get("total", len(records)),
        }
    except (requests.RequestException, ValueError, TypeError, OverflowError):
        raise MarketError("Market price service is unavailable", 502) from None
