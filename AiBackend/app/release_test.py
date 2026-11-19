import base64
import io
import json
import wave
from datetime import datetime, timezone
from pathlib import Path

import httpx
import pytest
import requests
from PIL import Image
from sarvamai import SarvamAI
import pymupdf

from app import create_app, security, speech
from app.live_data import fetch_current_weather
from app.mandi import MarketError, fetch_mandi_page


@pytest.fixture
def client(monkeypatch):
    for name in (
        "FLASK_ENV",
        "NODE_ENV",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
        "ACCOUNT_URL",
        "DISABLED_ADVICE_PATHS",
        "PAID_REQUESTS_PER_DAY",
        "OPEN_METEO_API_KEY",
        "MET_FORECAST_ENABLED",
    ):
        monkeypatch.setenv(name, "")
    for name in ("OPENAI_API_KEY", "PERPLEXITY_API_KEY", "GEMINI_API_KEY"):
        monkeypatch.setenv(name, "")
    security._buckets.clear()
    app = create_app()
    monkeypatch.setattr("app.farmer_context.authenticated_profile", lambda: {})
    monkeypatch.setattr("app.auth.current_user_id", lambda: ("fixture-user", None))
    return app.test_client()


def wave_bytes():
    output = io.BytesIO()
    with wave.open(output, "wb") as writer:
        writer.setparams((1, 2, 8000, 0, "NONE", ""))
        writer.writeframes(bytes(160))
    return output.getvalue()


@pytest.mark.parametrize("status,expected", [(200, 200), (429, 503), (500, 502)])
def test_speech_wire_contract(client, monkeypatch, status, expected):
    audio = base64.b64encode(wave_bytes()).decode()
    calls = []

    def provider(request):
        calls.append(request)
        return httpx.Response(status, json={"request_id": "fixture", "audios": [audio]})

    with httpx.Client(transport=httpx.MockTransport(provider)) as transport:
        monkeypatch.setattr(
            speech,
            "SarvamAI",
            lambda **kw: SarvamAI(
                api_subscription_key=kw["api_subscription_key"], httpx_client=transport
            ),
        )
        monkeypatch.setenv("SARVAM_API_KEY", "fixture")
        reply = client.post("/voice/tts", json={"text": "hello", "lang": "hi"})
    assert reply.status_code == expected
    assert len(calls) == 1
    assert calls[0].url.path == "/text-to-speech"
    assert json.loads(calls[0].content)["language_code"] == "hi-IN"
    if expected == 200:
        assert reply.json == {"audio_base64": audio, "language": "hi-IN"}


def test_missing_key_makes_no_call(client, monkeypatch):
    monkeypatch.setenv("SARVAM_API_KEY", "")
    monkeypatch.setattr(
        speech, "SarvamAI", lambda **kw: pytest.fail("Unexpected client")
    )
    assert client.post("/voice/tts", json={"text": "hello"}).status_code == 503


def test_speech_never_silently_truncates_an_answer(client):
    assert client.post("/voice/tts", json={"text": "x" * 2401}).status_code == 400


@pytest.mark.parametrize(
    "path,field",
    [
        ("/crop_suggestion", "land_acres"),
        ("/water_management", "field_size_acres"),
    ],
)
def test_boolean_is_not_a_field_area(client, path, field):
    assert (
        client.post(
            path, json={field: True, "latitude": 12, "longitude": 77, "crop": "Rice"}
        ).status_code
        == 400
    )


def test_counter_outage_blocks_paid_traffic(client, monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "production")
    result = client.post("/voice/tts", json={"text": "hello"})
    assert result.status_code == 503
    assert result.json["code"] == "counter_unavailable"


def test_budget_and_switch(client, monkeypatch):
    monkeypatch.setenv("PAID_REQUESTS_PER_DAY", "1")
    monkeypatch.setenv("SARVAM_API_KEY", "")
    assert (
        client.post("/voice/tts", json={"text": "hello"}).json["code"]
        == "service_unavailable"
    )
    assert (
        client.post("/voice/tts", json={"text": "hello"}).json["code"] == "budget_limit"
    )
    monkeypatch.setenv("DISABLED_ADVICE_PATHS", "/voice/tts")
    assert (
        client.post("/voice/tts", json={"text": "hello"}).json["code"]
        == "feature_disabled"
    )
    monkeypatch.setenv("DISABLED_ADVICE_PATHS", "/weather")
    unavailable = client.get("/weather?lat=12&lon=77")
    assert unavailable.status_code == 503
    assert unavailable.json["code"] == "feature_disabled"
    assert unavailable.headers["Cache-Control"] == "private, no-store"


def test_chat_does_not_call_a_model_to_replace_missing_live_data(client, monkeypatch):
    monkeypatch.setenv("DATA_GOV_API_KEY", "")
    monkeypatch.setattr(
        "app.routes.chatbot.route_models",
        lambda *_: pytest.fail("Ungrounded model request"),
    )
    reply = client.post(
        "/chatbot/ask", json={"question": "Wheat price and weather tomorrow"}
    )
    assert reply.status_code == 503
    assert reply.json["code"] == "live_data_unavailable"
    assert reply.json["unavailable"] == ["market_prices", "weather"]


class ProviderReply:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self.payload


def test_market_preserves_identity_and_distinguishes_empty_from_failure(
    client, monkeypatch
):
    monkeypatch.setenv("DATA_GOV_API_KEY", "fixture")
    row = {
        "market": "Central",
        "district": "A",
        "grade": "FAQ",
        "variety": "Local",
        "modal_price": "2500",
        "arrival_date": "02/11/2026",
        "unit": "Rs/quintal",
    }
    monkeypatch.setattr(
        requests, "get", lambda *a, **kw: ProviderReply({"records": [row]})
    )
    assert fetch_mandi_page()["records"][0].items() >= row.items()
    monkeypatch.setattr(
        requests, "get", lambda *a, **kw: ProviderReply({"records": []})
    )
    assert fetch_mandi_page()["records"] == []
    monkeypatch.setattr(
        requests, "get", lambda *a, **kw: ProviderReply({"error": "upstream"})
    )
    reply = client.get("/api/market-compare?commodity=Rice&state_a=A&state_b=B")
    assert reply.status_code == 502
    with pytest.raises(MarketError):
        fetch_mandi_page(state="<invalid>")


def test_submitted_prices_have_honest_dates_units_and_source(client):
    rows = [
        {"arrival_date": "02/11/2026", "modal_price": "2500"},
        {"arrival_date": "31/10/2026", "modal_price": "2400"},
    ]
    reply = client.post("/api/market-analysis", json={"records": rows})
    assert reply.json["source"] == "Submitted market records"
    assert reply.json["asOf"] == "2026-10-31 to 2026-11-02"
    rows[0]["unit"] = "Rs/kg"
    assert (
        client.post("/api/market-analysis", json={"records": rows}).status_code == 400
    )
    rows[0]["modal_price"] = "NaN"
    assert (
        client.post("/api/market-analysis", json={"records": rows}).status_code == 400
    )


def test_current_weather_uses_one_observation(monkeypatch):
    monkeypatch.setenv("OPEN_METEO_API_KEY", "fixture")
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "")
    data = {
        "current": {
            "time": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M"),
            "temperature_2m": 26,
            "relative_humidity_2m": 67,
            "precipitation": 0,
            "wind_speed_10m": 4,
        }
    }

    def get(url, *, params, **options):
        assert url == "https://customer-api.open-meteo.com/v1/forecast"
        assert params["apikey"] == "fixture"
        assert options["allow_redirects"] is False
        return ProviderReply(data)

    monkeypatch.setattr(requests, "get", get)
    reply = fetch_current_weather(12, 77)
    assert (reply["humidity"], reply["asOf"]) == (67, data["current"]["time"])
    data["current"]["time"] = "2000-01-01T00:00"
    assert fetch_current_weather(12, 77) is None


@pytest.mark.parametrize(
    "result,expected",
    [
        ("plain text", 502),
        ('{"confidence":0}', 502),
        (
            '{"confidence":true,"plant":"Rice","disease":"Spots","leaf_health":"Spots"}',
            502,
        ),
        (
            '{"confidence":1.5,"plant":"Rice","disease":"Spots","leaf_health":"Spots"}',
            502,
        ),
        ('{"confidence":0.1,"plant":"","disease":"","leaf_health":""}', 422),
    ],
)
def test_photo_validates_input_and_model_output(client, monkeypatch, result, expected):
    monkeypatch.setenv("GEMINI_API_KEY", "fixture")
    monkeypatch.setenv("GEMINI_MODEL", "fixture")

    def assess(prompt, encoded, *, schema):
        img = Image.open(io.BytesIO(base64.b64decode(encoded)))
        assert img.format == "JPEG"
        assert schema["properties"]["confidence"]["type"] == "number"
        return result, "fixture"

    monkeypatch.setattr("app.routes.plant_disease.ask_gemini_vision", assess)
    assert (
        client.post(
            "/plant-disease", data={"image": (io.BytesIO(b"bad"), "x.jpg")}
        ).status_code
        == 400
    )
    photo = io.BytesIO()
    Image.new("RGB", (8, 8)).save(photo, "PNG")
    photo.seek(0)
    assert (
        client.post("/plant-disease", data={"image": (photo, "x.png")}).status_code
        == expected
    )


def test_partial_soil_card_never_becomes_a_fertilizer_rate(client, monkeypatch):
    monkeypatch.setattr(
        "app.routes.fertilizer.get_weather", lambda *_: {"temperature": 23}
    )
    req = {"crop": "rice", "lat": 12, "lon": 77, "soil_health_card": {"soil_ph": 6.5}}
    result = client.post("/api/fertilizer_recommendation", json=req)
    assert result.status_code == 200 and result.json["rate_available"] is False
    assert result.json["soil_data"]["soil_nitrogen"] is None


def test_advice_result_log_is_correlated_without_user_content(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "fixture")
    monkeypatch.setattr(
        "app.llm._post_json",
        lambda *_: {"choices": [{"message": {"content": "Sensitive fixture answer"}}]},
    )
    events = []
    monkeypatch.setattr(
        client.application.logger,
        "info",
        lambda _message, *, extra: events.append(extra["event_fields"]),
    )
    response = client.post(
        "/chatbot/ask", json={"question": "Explain private composting notes"}
    )
    assert response.status_code == 200
    assert [event for event in events if event["event"] == "advice_result"] == [
        {
            "event": "advice_result",
            "request_id": response.headers["X-Request-ID"],
            "route": "/chatbot/ask",
            "provider": "chatgpt",
            "outcome": "generated",
        }
    ]


def test_all_advice_routes_are_documented_and_guarded(monkeypatch):
    for name in (
        "NODE_ENV",
        "FLASK_ENV",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
    ):
        monkeypatch.setenv(name, "")
    for name in ("OPENAI_API_KEY", "PERPLEXITY_API_KEY", "GEMINI_API_KEY"):
        monkeypatch.setenv(name, "")
    security._buckets.clear()
    app = create_app()
    contract = json.loads(
        (Path(__file__).resolve().parents[2] / "backend/api-contract.json").read_text()
    )
    expected = {
        (r["path"], r["method"]) for r in contract["routes"] if r["service"] == "advice"
    }
    actual = {
        (r.rule, method)
        for r in app.url_map.iter_rules()
        if r.endpoint != "static"
        for method in r.methods - {"OPTIONS", "HEAD"}
    }
    assert actual == expected
    with app.test_client() as anonymous:
        for path, method in actual:
            response = anonymous.open(path, method=method)
            assert response.status_code == (200 if path == "/health" else 401)


@pytest.mark.parametrize(
    "mime,filename", [("audio/m4a", "speech.m4a"), ("audio/wav", "speech.wav")]
)
def test_microphone_transport(client, monkeypatch, mime, filename):
    monkeypatch.setenv("SARVAM_API_KEY", "fixture")

    def recognize(url, *, files, data, **kwargs):
        assert files["file"][0] == filename and files["file"][2] == mime
        assert files["file"][1].read() == b"fixture-recording"
        assert data["language_code"] == "bn-IN"
        return ProviderReply({"transcript": "fixture transcript"})

    monkeypatch.setattr(requests, "post", recognize)
    response = client.post(
        "/voice/stt",
        data={
            "audio": (io.BytesIO(b"fixture-recording"), filename, mime),
            "lang": "bn",
        },
    )
    assert response.json == {"transcript": "fixture transcript"}


def test_news_has_attribution_and_real_publication_date(client, monkeypatch):
    article = {
        "title": "Local harvest",
        "iso_date": "2024-11-01T06:00:00Z",
        "link": "https://example.org/crop",
        "source": {"name": "Fixture publisher"},
    }

    def news(*args, **kwargs):
        return ProviderReply(
            {
                "news_results": [
                    {"stories": [article, article, {"title": "Unknown date"}]}
                ]
            }
        )

    monkeypatch.setenv("SERP_API_KEY", "fixture")
    monkeypatch.setattr(requests, "get", news)
    monkeypatch.setattr(ProviderReply, "status_code", 200, raising=False)
    result = client.get("/news")
    assert len(result.json["news_results"]) == 1
    assert result.json["news_results"][0]["published_date"].startswith("2024-11-01")


def test_document_explanation_discloses_page_limit(client, monkeypatch):
    with pymupdf.open() as doc:
        doc.new_page().insert_text((50, 50), "Fixture document.")
        for _ in range(50):
            doc.new_page()
        data = doc.tobytes()
    monkeypatch.setattr(
        "app.routes.translate.route_models", lambda *args: ("Explanation", "fixture")
    )
    reply = client.post(
        "/translate",
        data={"file": (io.BytesIO(data), "fixture.pdf"), "target_language": "English"},
    )
    assert reply.status_code == 200 and reply.json["partial"] is True
    assert "Partial" in reply.json["translated_document"]
