import hashlib
import hmac
import os
import time
from threading import Lock

import requests
from flask import jsonify, request
from app.config import redis_namespace

_buckets = {}
_lock = Lock()
_INCREMENT = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n"
_PAID_PATHS = {
    "/chatbot/ask",
    "/voice/stt",
    "/voice/tts",
    "/plant-disease",
    "/translate",
    "/news",
    "/market/insights",
    "/api/market-analysis",
    "/water_management",
    "/postharvest",
}


def production():
    return "production" in (os.getenv("FLASK_ENV"), os.getenv("NODE_ENV"))


def staging_authorized():
    key = os.getenv("STAGING_ACCESS_KEY")
    return not key or (
        len(key) >= 32
        and hmac.compare_digest(
            key.encode(), request.headers.get("X-Staging-Key", "").encode()
        )
    )


def _increment(key, window):
    url = os.getenv("UPSTASH_REDIS_REST_URL")
    token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
    if url or token or production():
        if not url or not url.startswith("https://") or not token:
            raise ValueError("Unavailable counter configuration")
        response = requests.post(
            url,
            json=["EVAL", _INCREMENT, 1, key, window],
            headers={"Authorization": f"Bearer {token}"},
            timeout=2,
            allow_redirects=False,
        )
        response.raise_for_status()
        payload = response.json()
        result = payload.get("result") if isinstance(payload, dict) else None
        if type(result) is not int or result < 1:
            raise ValueError("Invalid counter response")
        return result
    now = time.monotonic()
    with _lock:
        if len(_buckets) >= 4096:
            for expired in [k for k, (_, end) in _buckets.items() if end <= now]:
                del _buckets[expired]
            if key not in _buckets and len(_buckets) >= 4096:
                raise ValueError("Local counter capacity reached")
        count, end = _buckets.get(key, (0, now + window))
        if end <= now:
            count, end = 0, now + window
        _buckets[key] = (count + 1, end)
        return count + 1


def check_rate_limit(user_id=None):
    paid = request.path in _PAID_PATHS
    if user_id and not paid:
        return None
    identity = str(user_id or request.remote_addr or "unknown")
    subject = hashlib.sha256(identity.encode()).hexdigest()
    namespace = "paid:" + request.path if user_id else "ip"
    try:
        scope = redis_namespace()
        if _increment(f"{scope}:advice:{namespace}:{subject}", 60) > (
            20 if user_id else 60
        ):
            return (
                jsonify(error="Too many requests", code="rate_limited"),
                429,
                {"Retry-After": "60"},
            )
        if user_id:
            disabled = os.getenv("DISABLED_ADVICE_PATHS", "").split(",")
            if request.path in {path.strip() for path in disabled}:
                return jsonify(
                    error="This feature is temporarily unavailable",
                    code="feature_disabled",
                ), 503
            raw_limit = os.getenv("PAID_REQUESTS_PER_DAY")
            if production() or raw_limit:
                limit = int(raw_limit or "0")
                if (
                    limit <= 0
                    or _increment(
                        f"{scope}:advice:budget:{int(time.time()) // 86400}", 86400
                    )
                    > limit
                ):
                    return jsonify(
                        error="Daily advisory allowance unavailable",
                        code="budget_limit",
                    ), 503
    except (requests.RequestException, ValueError, TypeError):
        return jsonify(
            error="Request controls unavailable", code="counter_unavailable"
        ), 503
    return None


def cors_origins():
    raw = os.getenv("CORS_ORIGINS", "")
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    if origins:
        return origins
    if os.getenv("FLASK_ENV") == "production" or os.getenv("NODE_ENV") == "production":
        return []
    return "*"
