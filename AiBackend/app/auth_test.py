import time
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from flask import Flask
from app import auth


@pytest.mark.parametrize(
    "change,expected",
    [
        ({}, None),
        ({"iss": "other"}, 401),
        ({"aud": "other"}, 401),
        ({"exp": 1}, 401),
        ({"sub": "invalid"}, 401),
    ],
)
def test_signed_token_enforces_identity_contract(monkeypatch, change, expected):
    key = Ed25519PrivateKey.generate()
    monkeypatch.setenv("NEON_AUTH_ISSUER", "issuer")
    monkeypatch.setenv("NEON_AUTH_AUDIENCE", "audience")
    monkeypatch.setenv("NEON_AUTH_JWKS_URL", "https://identity.example/jwks")
    monkeypatch.setattr(
        auth,
        "_jwks",
        lambda: SimpleNamespace(
            get_signing_key_from_jwt=lambda _: SimpleNamespace(key=key.public_key())
        ),
    )
    payload = {
        "sub": "00000000-0000-4000-8000-000000000001",
        "iss": "issuer",
        "aud": "audience",
        "exp": int(time.time()) + 60,
        **change,
    }
    token = jwt.encode(payload, key, algorithm="EdDSA")
    with Flask(__name__).test_request_context(
        headers={"Authorization": "Bearer " + token}
    ):
        user_id, error = auth.current_user_id()
    if expected is None:
        assert user_id == payload["sub"] and error is None
    else:
        assert user_id is None and error[1] == expected


def test_unreachable_signing_key_service_does_not_end_session(monkeypatch):
    monkeypatch.setenv("NEON_AUTH_JWKS_URL", "https://identity.example/jwks")

    def unavailable():
        raise jwt.PyJWKClientConnectionError("fixture outage")

    monkeypatch.setattr(auth, "_jwks", unavailable)
    with Flask(__name__).test_request_context(
        headers={"Authorization": "Bearer fixture"}
    ):
        assert auth.current_user_id()[1][1] == 503
