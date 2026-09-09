import os
import requests
from flask import request

TIMEOUT = 8


def farmer_profile():
    base = (os.getenv("ACCOUNT_URL") or "").rstrip("/")
    header = request.headers.get("Authorization") or ""
    if not base or not header.startswith("Bearer "):
        return {}
    try:
        response = requests.get(
            f"{base}/api/auth/me",
            headers={"Authorization": header},
            timeout=TIMEOUT,
        )
        if response.status_code != 200:
            return {}
        user = (response.json() or {}).get("user") or {}
    except (requests.RequestException, ValueError, TypeError):
        return {}
    location = user.get("location") or {}
    languages = user.get("languageSpoken") or []
    return {
        "lat": location.get("lat") or 0,
        "lon": location.get("lon") or 0,
        "city": location.get("city") or "",
        "state": location.get("state") or "",
        "lang": languages[0] if languages else "",
    }
