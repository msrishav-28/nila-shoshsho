import pytest

from app import llm


@pytest.mark.parametrize("question", ["Explain crop rotation", "Latest mandi prices"])
def test_only_configured_provider_is_called(monkeypatch, question):
    monkeypatch.setenv("OPENAI_API_KEY", " ")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "")
    monkeypatch.setenv("GEMINI_API_KEY", "fixture")
    monkeypatch.setenv("GEMINI_MODEL", "fixture-model")
    calls = []

    def unavailable(*args):
        pytest.fail("An unconfigured provider was called")

    def gemini(*args):
        calls.append(args)
        return "Fixture advice", "gemini"

    monkeypatch.setattr(llm, "ask_openai", unavailable)
    monkeypatch.setattr(llm, "ask_perplexity", lambda *args: unavailable(*args))
    monkeypatch.setattr(llm, "ask_gemini", gemini)
    assert llm.route_models(question, "English") == ("Fixture advice", "gemini")
    assert calls == [(question, "English")]


def test_missing_credentials_remain_unavailable(monkeypatch):
    for name in ("OPENAI_API_KEY", "PERPLEXITY_API_KEY", "GEMINI_API_KEY"):
        monkeypatch.setenv(name, " ")
    with pytest.raises(llm.AdvisorUnavailable) as error:
        llm.route_models("Explain crop rotation", "English")
    assert error.value.status == 503


def test_failing_configured_provider_uses_available_fallback(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "fixture")
    monkeypatch.setenv("PERPLEXITY_API_KEY", "")
    monkeypatch.setenv("GEMINI_API_KEY", "fixture")
    monkeypatch.setenv("GEMINI_MODEL", "fixture-model")
    calls = []

    def openai(*args):
        calls.append("openai")
        raise TimeoutError()

    def perplexity(*args):
        pytest.fail("An unconfigured fallback was called")

    def gemini(*args):
        calls.append("gemini")
        return "Fixture advice", "gemini"

    monkeypatch.setattr(llm, "ask_openai", openai)
    monkeypatch.setattr(llm, "ask_perplexity", perplexity)
    monkeypatch.setattr(llm, "ask_gemini", gemini)
    assert llm.route_models("Explain crop rotation", "English")[1] == "gemini"
    assert calls == ["openai", "gemini"]
