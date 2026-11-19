import pytest
from app import cache


def test_shared_cache_uses_expiry_and_does_not_store_sensitive_parameters(monkeypatch):
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://fixture.invalid")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "fixture")
    commands = []
    stored = {}

    class Reply:
        def raise_for_status(self):
            pass

        def json(self):
            command = commands[-1]
            if command[0] == "GET":
                return {"result": stored.get(command[1])}
            stored[command[1]] = command[2]
            return {"result": "OK"}

    def post(url, **kwargs):
        commands.append(kwargs["json"])
        return Reply()

    monkeypatch.setattr(cache.requests, "post", post)

    def load():
        return {"asOf": "2026-11-19", "source": "fixture"}

    result = cache.cached_data("weather", [12.345678, 77.123456], load, 300)
    assert commands[-1][-2:] == ["EX", 300]
    assert "12.345678" not in commands[-1][1]
    assert (
        cache.cached_data(
            "weather", [12.345678, 77.123456], lambda: pytest.fail("cache miss"), 300
        )
        == result
    )


def test_failed_provider_result_is_never_cached(monkeypatch):
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "")

    def failed():
        raise ValueError("fixture upstream rejection")

    with pytest.raises(ValueError):
        cache.cached_data("market", [], failed, 3600)
