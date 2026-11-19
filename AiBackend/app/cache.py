import hashlib
import json
import logging
import os

import requests
from app.deadline import provider_timeout


def cached_data(namespace, parameters, loader, ttl):
    url = os.getenv("UPSTASH_REDIS_REST_URL")
    token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        return loader()
    digest = hashlib.sha256(json.dumps(parameters, sort_keys=True).encode()).hexdigest()
    key = f"nila:cache:{namespace}:{digest}"

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
    except (requests.RequestException, ValueError, KeyError, TypeError):
        logging.getLogger(__name__).warning(
            "cache_read_unavailable namespace=%s", namespace
        )
    value = loader()
    if value is not None:
        try:
            command(["SET", key, json.dumps(value, allow_nan=False), "EX", ttl])
        except (requests.RequestException, ValueError, KeyError, TypeError):
            logging.getLogger(__name__).warning(
                "cache_write_unavailable namespace=%s", namespace
            )
    return value
