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


def test_protected_provider_requires_a_shared_refresh_reservation(monkeypatch):
    monkeypatch.setenv("UPSTASH_REDIS_REST_URL", "https://fixture.invalid")
    monkeypatch.setenv("UPSTASH_REDIS_REST_TOKEN", "fixture")
    replies = iter([None, 1, "OK", None, 0])
    commands = []

    class Reply:
        def raise_for_status(self):
            pass

        def json(self):
            return {"result": next(replies)}

    def post(url, **kwargs):
        commands.append(kwargs["json"])
        return Reply()

    monkeypatch.setattr(cache.requests, "post", post)
    assert cache.cached_data(
        "met", [12, 77], lambda: [1], 21600, reserve_refresh=True
    ) == [1]

    def denied():
        pytest.fail("refresh should be denied")

    assert (
        cache.cached_data("met", [12, 77], denied, 21600, reserve_refresh=True) is None
    )
    assert commands[1][0] == "EVAL" and commands[1][-1] == 21600
    assert commands[1][-3].endswith(":refresh") and commands[1][-2].endswith(":rate")
    monkeypatch.delenv("UPSTASH_REDIS_REST_TOKEN")
    assert (
        cache.cached_data("met", [12, 77], denied, 21600, reserve_refresh=True) is None
    )
