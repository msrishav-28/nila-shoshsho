import os
import requests
from app.deadline import provider_timeout
from flask import g, request


class ProfileUnavailable(Exception):
    def __init__(self, status):
        super().__init__(
            "Account session unavailable" if status == 503 else "Session ended"
        )
        self.status = status


TIMEOUT = 8


def authenticated_profile():
    base = (os.getenv("ACCOUNT_URL") or "").rstrip("/")
    header = request.headers.get("Authorization") or ""
    if not base or not header.startswith("Bearer "):
        raise ProfileUnavailable(503)
    headers = {"Authorization": header, "X-Request-ID": g.request_id}
    if os.getenv("STAGING_ACCESS_KEY"):
        headers["X-Staging-Key"] = os.environ["STAGING_ACCESS_KEY"]
    try:
        response = requests.get(
            f"{base}/api/auth/me",
            headers=headers,
            timeout=provider_timeout(TIMEOUT),
            allow_redirects=False,
        )
        if response.status_code != 200:
            raise ProfileUnavailable(401 if response.status_code == 401 else 503)
        user = (response.json() or {}).get("user") or {}
    except (requests.RequestException, ValueError, TypeError):
        raise ProfileUnavailable(503) from None
    if not isinstance(user, dict) or user.get("_id") != request.farmer_id:
        raise ProfileUnavailable(503)
    location = user.get("location") or {}
    languages = user.get("languageSpoken") or []
    return {
        "lat": location.get("lat") or 0,
        "lon": location.get("lon") or 0,
        "city": location.get("city") or "",
        "state": location.get("state") or "",
        "lang": languages[0] if languages else "",
    }


def farmer_profile():
    return g.farmer_profile
