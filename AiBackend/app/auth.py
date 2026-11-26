import os
import re

import jwt
from flask import request
from jwt import PyJWKClient
from app.logging_config import log_failure

_jwks_client = None


def _jwks():
    global _jwks_client
    url = os.getenv("NEON_AUTH_JWKS_URL")
    if not url:
        raise RuntimeError("NEON_AUTH_JWKS_URL is not set")
    if _jwks_client is None:
        _jwks_client = PyJWKClient(url, timeout=5)
    return _jwks_client


def current_user_id():
    header = request.headers.get("Authorization") or ""
    parts = header.split(" ", 1)
    if len(parts) != 2 or parts[0] != "Bearer" or not parts[1]:
        return None, ("Unauthorized - No Token Provided", 401)
    issuer = os.getenv("NEON_AUTH_ISSUER")
    audience = os.getenv("NEON_AUTH_AUDIENCE")
    if "production" in (os.getenv("NODE_ENV"), os.getenv("FLASK_ENV")) and not (
        issuer and audience
    ):
        return None, ("Identity validation is not configured", 503)
    if not os.getenv("NEON_AUTH_JWKS_URL"):
        return None, ("Identity validation is not configured", 503)
    try:
        signing_key = _jwks().get_signing_key_from_jwt(parts[1])
        payload = jwt.decode(
            parts[1],
            signing_key.key,
            algorithms=["EdDSA", "RS256", "ES256"],
            issuer=issuer,
            audience=audience,
            options={"require": ["sub", "exp"], "verify_aud": bool(audience)},
        )
    except (jwt.PyJWKClientConnectionError, jwt.PyJWKSetError, ValueError) as error:
        log_failure("identity_keys", error)
        return None, ("Identity validation is temporarily unavailable", 503)
    except jwt.PyJWTError:
        return None, ("Unauthorized - Token is Invalid", 401)
    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not re.fullmatch(
        r"[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}", user_id
    ):
        return None, ("Unauthorized - Token is Invalid", 401)
    return user_id, None
