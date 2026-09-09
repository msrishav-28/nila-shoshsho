import os
from functools import wraps

import jwt
from flask import jsonify, request
from jwt import PyJWKClient

_jwks_client = None


def _jwks():
    global _jwks_client
    url = os.getenv("NEON_AUTH_JWKS_URL")
    if not url:
        raise RuntimeError("NEON_AUTH_JWKS_URL is not set")
    if _jwks_client is None:
        _jwks_client = PyJWKClient(url)
    return _jwks_client


def current_user_id():
    header = request.headers.get("Authorization") or ""
    parts = header.split(" ", 1)
    if len(parts) != 2 or parts[0] != "Bearer" or not parts[1]:
        return None, ("Unauthorized - No Token Provided", 401)
    try:
        signing_key = _jwks().get_signing_key_from_jwt(parts[1])
        payload = jwt.decode(
            parts[1],
            signing_key.key,
            algorithms=["RS256", "ES256"],
            options={"require": ["sub", "exp"]},
        )
    except Exception:
        return None, ("Unauthorized - Token is Invalid", 401)
    user_id = payload.get("sub")
    if not user_id:
        return None, ("Unauthorized - Token is Invalid", 401)
    return user_id, None


def require_auth(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        user_id, error = current_user_id()
        if error:
            message, status = error
            return jsonify({"error": message}), status
        request.farmer_id = user_id
        return fn(*args, **kwargs)

    return wrapped
