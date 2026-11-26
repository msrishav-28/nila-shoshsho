"""Verify the protected Render demo with a disposable synthetic account."""

import argparse
from datetime import date
from pathlib import Path
from secrets import token_urlsafe
from uuid import uuid4

import requests
from dotenv import dotenv_values

ACCOUNT = "https://nila-shoshsho-account-staging.onrender.com"
ADVICE = "https://nila-shoshsho-advice-staging.onrender.com"


def verify(staging_key):
    with requests.Session() as http:

        def call(label, origin, path, expected, method="GET", headers=None, **kwargs):
            response = http.request(
                method,
                origin + path,
                headers=headers,
                timeout=(8, 35),
                allow_redirects=False,
                **kwargs,
            )
            print(f"{label} {response.status_code}", flush=True)
            if response.status_code != expected:
                raise ValueError(f"Unexpected result from {label}")
            if response.headers.get("Cache-Control") != "private, no-store":
                raise ValueError(f"Missing no-store policy for {label}")
            return response.json()

        gate = {"X-Staging-Key": staging_key}
        for origin, private_route in ((ACCOUNT, "/api/auth/me"), (ADVICE, "/search")):
            call("health", origin, "/health", 200)
            call("staging gate", origin, private_route, 404)
            call("missing identity", origin, private_route, 401, headers=gate)

        unique = uuid4().hex
        credentials = {
            "email": f"nila-demo-{unique}@example.com",
            "password": token_urlsafe(24),
        }
        user = call(
            "synthetic signup",
            ACCOUNT,
            "/api/auth/signup",
            201,
            "POST",
            gate,
            json={
                **credentials,
                "username": "Demo fixture",
                "role": "Farmer",
                "gender": "Other",
            },
        )["user"]
        headers = {**gate, "Authorization": f"Bearer {user['accessToken']}"}
        try:
            call("authenticated account", ACCOUNT, "/api/auth/me", 200, headers=headers)
            result = call(
                "authenticated advice",
                ADVICE,
                "/search?q=weather",
                200,
                headers=headers,
            )
            if not any(item["id"] == "weather" for item in result["results"]):
                raise ValueError("Weather absent from feature search")
            weather = call(
                "dashboard weather",
                ADVICE,
                "/weather?lat=28.621&lon=77.211",
                200,
                headers=headers,
            )
            conditions = weather["open_meteo"]
            if not (conditions.get("current") or conditions.get("daily")):
                raise ValueError("Dashboard weather has no data")
            window = call(
                "crop calendar",
                ADVICE,
                "/crop_calendar",
                200,
                "POST",
                headers,
                json={"crop": "Wheat", "latitude": 28.621, "longitude": 77.211},
            )
            if window["window"]["crop"] != "Wheat":
                raise ValueError("Unexpected crop calendar")

            plot = {
                "crop": "Wheat",
                "lat": 28.62,
                "lon": 77.21,
                "areaAcres": 2,
                "sowingDate": date.today().isoformat(),
            }
            idempotent = {**headers, "Idempotency-Key": unique}
            created = call(
                "create plot", ACCOUNT, "/api/plots", 201, "POST", idempotent, json=plot
            )["plot"]
            plot_path = f"/api/plots/{created['plotId']}"
            try:
                replayed = call(
                    "replay plot creation",
                    ACCOUNT,
                    "/api/plots",
                    201,
                    "POST",
                    idempotent,
                    json=plot,
                )["plot"]
                if replayed["plotId"] != created["plotId"]:
                    raise ValueError("Plot retry created a second record")
            finally:
                call(
                    "remove synthetic plot", ACCOUNT, plot_path, 200, "DELETE", headers
                )
        finally:
            call("logout", ACCOUNT, "/api/auth/logout", 200, "POST", headers, json={})

        call("revoked account session", ACCOUNT, "/api/auth/me", 401, headers=headers)
        call("revoked advice session", ADVICE, "/search", 401, headers=headers)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--env-file",
        type=Path,
        default=Path(__file__).resolve().parent.parent / ".env.local",
    )
    settings = parser.parse_args()
    staging_key = dotenv_values(settings.env_file, interpolate=False).get(
        "NILA_RENDER_STAGING_KEY"
    )
    if not staging_key:
        raise SystemExit("NILA_RENDER_STAGING_KEY is required for the protected demo")
    try:
        verify(staging_key)
    except (requests.RequestException, ValueError, KeyError, TypeError) as error:
        raise SystemExit(f"Demo smoke failed ({type(error).__name__})") from None
    print("Protected Render demo smoke passed")


if __name__ == "__main__":
    main()
