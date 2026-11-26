"""Private process probe for release operators. Does not call a paid AI provider."""

import os
import sys

import requests
from app.config import load_environment
from app.security import production


def main():
    load_environment()
    try:
        if not production() or os.getenv("FLASK_DEBUG") == "1":
            raise ValueError("Invalid production settings")
        if int(os.environ["PAID_REQUESTS_PER_DAY"]) < 1:
            raise ValueError("Set a positive daily request budget")
        if not os.environ["NEON_AUTH_ISSUER"] or not os.environ["NEON_AUTH_AUDIENCE"]:
            raise ValueError("Identity contract missing")
        url = os.environ["UPSTASH_REDIS_REST_URL"]
        token = os.environ["UPSTASH_REDIS_REST_TOKEN"]
        if not url.startswith("https://") or not token:
            raise ValueError("Invalid counter configuration")
        result = requests.post(
            url,
            json=["PING"],
            headers={"Authorization": f"Bearer {token}"},
            timeout=3,
            allow_redirects=False,
        )
        result.raise_for_status()
        if result.json()["result"] != "PONG":
            raise ValueError("Counter unavailable")
        keys = requests.get(
            os.environ["NEON_AUTH_JWKS_URL"], timeout=3, allow_redirects=False
        )
        keys.raise_for_status()
        if not keys.json()["keys"]:
            raise ValueError("No signing keys")
        account = requests.get(
            os.environ["ACCOUNT_URL"].rstrip("/") + "/health",
            timeout=3,
            allow_redirects=False,
        )
        account.raise_for_status()
        if account.json()["ok"] is not True:
            raise ValueError("Account service unavailable")
    except (KeyError, TypeError, ValueError, requests.RequestException):
        print(
            "Advice readiness failed. Check production settings, counters, identity and account service.",
            file=sys.stderr,
        )
        return 1
    print("Advice dependencies ready.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
