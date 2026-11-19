import base64
import io
import json
import time
import wave
from pathlib import Path
from types import SimpleNamespace

import httpx
import jwt
import pymupdf
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from PIL import Image
from sarvamai import SarvamAI

from app import create_app, auth, security, speech
import requests


def test_all_advice_routes_with_verified_identity_and_controlled_providers(monkeypatch):
    user_id = "00000000-0000-4000-8000-000000000001"
    key = Ed25519PrivateKey.generate()
    monkeypatch.setattr(
        auth,
        "_jwks",
        lambda: SimpleNamespace(
            get_signing_key_from_jwt=lambda _: SimpleNamespace(key=key.public_key())
        ),
    )
    for name, value in {
        "NEON_AUTH_ISSUER": "fixture",
        "NEON_AUTH_AUDIENCE": "fixture",
        "NEON_AUTH_JWKS_URL": "https://identity.fixture/jwks",
        "STAGING_ACCESS_KEY": "advice-fixture-stage-key" * 2,
        "ACCOUNT_URL": "https://account.fixture",
        "UPSTASH_REDIS_REST_URL": "",
        "UPSTASH_REDIS_REST_TOKEN": "",
        "FLASK_ENV": "",
        "NODE_ENV": "",
        "PAID_REQUESTS_PER_DAY": "",
        "DISABLED_ADVICE_PATHS": "",
        "DATA_GOV_API_KEY": "fixture",
        "GEMINI_API_KEY": "fixture",
        "GEMINI_MODEL": "fixture",
        "OPENAI_API_KEY": "fixture",
        "PERPLEXITY_API_KEY": "fixture",
        "SARVAM_API_KEY": "fixture",
        "SERP_API_KEY": "fixture",
        "MYSCHEME_API_KEY": "fixture",
        "IMD_API_KEY": "fixture",
    }.items():
        monkeypatch.setenv(name, value)
    token = jwt.encode(
        {
            "sub": user_id,
            "iss": "fixture",
            "aud": "fixture",
            "exp": int(time.time()) + 120,
        },
        key,
        algorithm="EdDSA",
    )

    class Reply:
        status_code = 200
        headers = {"Content-Type": "application/json"}
        content = b"fixture"

        def __init__(self, payload):
            self.payload = payload

        def raise_for_status(self):
            pass

        def json(self):
            return self.payload

    profile = {
        "_id": user_id,
        "languageSpoken": ["English"],
        "location": {"lat": 12, "lon": 77, "state": "Karnataka"},
    }
    market = {
        "commodity": "Rice",
        "state": "Karnataka",
        "district": "Fixture",
        "market": "Central",
        "variety": "Common",
        "grade": "FAQ",
        "arrival_date": "01/11/2026",
        "modal_price": "2500",
    }

    def get(url, **kwargs):
        if url.endswith("/api/auth/me"):
            assert kwargs["headers"]["Authorization"] == "Bearer " + token
            assert kwargs["headers"]["X-Staging-Key"] == "advice-fixture-stage-key" * 2
            return Reply({"user": profile})
        if "open-meteo" in url:
            if "current" in kwargs["params"]:
                if kwargs["params"]["latitude"] == 21:
                    return Reply({})
                return Reply(
                    {
                        "current": {
                            "time": "2026-11-19T12:00",
                            "temperature_2m": 25,
                            "relative_humidity_2m": 60,
                            "precipitation": 0,
                            "wind_speed_10m": 5,
                        }
                    }
                )
            fields = kwargs["params"]["daily"].split(",")
            return Reply(
                {"daily": {"time": ["2026-11-19"], **{field: [1] for field in fields}}}
            )
        if "data.gov.in" in url:
            return Reply({"records": [market], "total": 1})
        if "serpapi" in url:
            return Reply(
                {
                    "news_results": [
                        {
                            "title": "Fixture harvest",
                            "iso_date": "2026-11-01T12:00:00Z",
                            "source": {"name": "Fixture publisher"},
                            "link": "https://example.org/story",
                        }
                    ]
                }
            )
        if "myscheme" in url:
            return Reply({"items": []})
        raise AssertionError("Unexpected external request")

    def post(url, **kwargs):
        if "overpass" in url:
            return Reply({"elements": []})
        if "speech-to-text" in url:
            return Reply({"transcript": "rice price"})
        if "generativelanguage" in url:
            content = json.dumps(
                {
                    "plant": "Rice",
                    "disease": "Uncertain spotting",
                    "leaf_health": "Visible spots",
                    "confidence": 0.6,
                }
            )
            return Reply({"candidates": [{"content": {"parts": [{"text": content}]}}]})
        if "openai" in url or "perplexity" in url:
            return Reply(
                {"choices": [{"message": {"content": "Fixture explanatory response"}}]}
            )
        raise AssertionError("Unexpected external request")

    monkeypatch.setattr(requests, "get", get)
    monkeypatch.setattr(requests, "post", post)
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setparams((1, 2, 8000, 0, "NONE", ""))
        wav.writeframes(bytes(160))
    audio = base64.b64encode(output.getvalue()).decode()
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                200, json={"request_id": "fixture", "audios": [audio]}
            )
        )
    ) as transport:
        monkeypatch.setattr(
            speech,
            "SarvamAI",
            lambda **kw: SarvamAI(
                api_subscription_key=kw["api_subscription_key"], httpx_client=transport
            ),
        )
        security._buckets.clear()
        client = create_app().test_client()
        assert client.get("/health").status_code == 200
        assert client.get("/search").status_code == 404
        client.environ_base["HTTP_X_STAGING_KEY"] = "advice-fixture-stage-key" * 2
        client.environ_base["HTTP_AUTHORIZATION"] = "Bearer " + token
        assert client.get("/weather?lat=21").status_code == 400
        assert client.get("/weather?lat=&lon=76").status_code == 400
        forecast = client.get("/weather?lat=21&lon=76").get_json()
        assert forecast["imd"] is None and forecast["warnings"] is None
        assert forecast["open_meteo"]["current"] is None
        assert forecast["open_meteo"]["daily"]["source"] == "Open-Meteo"
        payloads = {
            "/chatbot/ask": {"question": "rice price"},
            "/govscheme": {"query": "farmer"},
            "/api/market-analysis": {"records": [market]},
            "/market/insights": {"crop": "Rice"},
            "/crop_calendar": {"crop": "Paddy"},
            "/crop_suggestion": {"land_acres": 2},
            "/api/fertilizer_recommendation": {
                "crop": "Rice",
                "soil_health_card": {"soil_ph": 6.5},
            },
            "/water_management": {"crop": "Rice", "field_size_acres": 2},
            "/postharvest": {"crop": "Rice", "harvest_date": "2026-11-18"},
            "/voice/tts": {"text": "hello", "lang": "en"},
        }
        queries = {
            "/api/market-compare": "?commodity=Rice&state_a=Karnataka&state_b=Kerala"
        }
        contract = json.loads(
            (
                Path(__file__).resolve().parents[2] / "backend/api-contract.json"
            ).read_text()
        )
        for route in (
            r
            for r in contract["routes"]
            if r["service"] == "advice" and r["path"] != "/health"
        ):
            path = route["path"]
            if route["method"] == "GET":
                response = client.get(path + queries.get(path, ""))
            elif path in payloads:
                response = client.post(path, json=payloads[path])
            else:
                if path == "/plant-disease":
                    image = io.BytesIO()
                    Image.new("RGB", (8, 8)).save(image, "PNG")
                    image.seek(0)
                    data = {"image": (image, "fixture.png")}
                elif path == "/translate":
                    with pymupdf.open() as pdf:
                        pdf.new_page().insert_text(
                            (50, 50), "Fixture agricultural document."
                        )
                        data = {
                            "file": (io.BytesIO(pdf.tobytes()), "fixture.pdf"),
                            "target_language": "English",
                        }
                else:
                    data = {
                        "audio": (io.BytesIO(b"fixture recording"), "speech.m4a"),
                        "lang": "en",
                    }
                response = client.post(path, data=data)
            assert response.status_code == 200, (path, response.json)
            assert set(route["successFields"]) <= response.json.keys(), path
