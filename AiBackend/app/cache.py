import hashlib
import json
import logging
import os

import requests
from app.config import redis_namespace
from app.deadline import provider_timeout

_RESERVE = """
if redis.call('GET', KEYS[1]) then return 0 end
local count = redis.call('INCR', KEYS[2])
if count == 1 then redis.call('EXPIRE', KEYS[2], 1) end
if count > 4 then return 0 end
redis.call('SET', KEYS[1], '1', 'EX', ARGV[1])
return 1
"""


def cached_data(namespace, parameters, loader, ttl, *, reserve_refresh=False):
    url = os.getenv("UPSTASH_REDIS_REST_URL")
    token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        return None if reserve_refresh else loader()
    digest = hashlib.sha256(json.dumps(parameters, sort_keys=True).encode()).hexdigest()
    prefix = f"{redis_namespace()}:cache:{namespace}"
    key = f"{prefix}:{digest}"

    def command(parts):
        response = requests.post(
            url,
            json=parts,
            headers={"Authorization": f"Bearer {token}"},
            timeout=provider_timeout(2),
            allow_redirects=False,
        )
        response.raise_for_status()
        payload = response.json()
        if "error" in payload:
            raise ValueError("Cache rejected command")
        return payload["result"]

    try:
        value = command(["GET", key])
        if isinstance(value, str):
            return json.loads(value)
        if reserve_refresh:
            admitted = command(
                ["EVAL", _RESERVE, 2, f"{key}:refresh", f"{prefix}:rate", ttl]
            )
            if type(admitted) is not int or admitted != 1:
                return None
    except (requests.RequestException, ValueError, KeyError, TypeError):
        logging.getLogger(__name__).warning(
            "cache_read_unavailable namespace=%s", namespace
        )
        if reserve_refresh:
            return None
    value = loader()
    if value is not None:
        try:
            command(["SET", key, json.dumps(value, allow_nan=False), "EX", ttl])
        except (requests.RequestException, ValueError, KeyError, TypeError):
            logging.getLogger(__name__).warning(
                "cache_write_unavailable namespace=%s", namespace
            )
    return value
