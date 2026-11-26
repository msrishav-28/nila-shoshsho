import os
import requests
import re
from app.deadline import provider_timeout
from app.logging_config import log_advice_result, log_failure

FRESH_HINTS = (
    "scheme",
    "subsidy",
    "price",
    "mandi",
    "news",
    "today",
    "latest",
    "weather",
    "current",
)


class AdvisorUnavailable(RuntimeError):
    def __init__(self, status=502):
        super().__init__("Advisor is unavailable")
        self.status = status


def _post_json(url, headers, payload):
    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=provider_timeout(20),
        allow_redirects=False,
    )
    response.raise_for_status()
    return response.json()


def ask_perplexity(question, lang):
    key = os.getenv("PERPLEXITY_API_KEY")
    if not key:
        raise RuntimeError("PERPLEXITY_API_KEY is not set")
    data = _post_json(
        "https://api.perplexity.ai/chat/completions",
        {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        {
            "model": "sonar",
            "max_tokens": 800,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"You advise Indian farmers. Answer in {lang}. "
                        "Do not invent prices, scheme amounts, or pesticide doses. "
                        "If live data is missing, say you do not know."
                    ),
                },
                {"role": "user", "content": question},
            ],
        },
    )
    return data["choices"][0]["message"]["content"], "perplexity"


def ask_openai(question, lang):
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    data = _post_json(
        "https://api.openai.com/v1/chat/completions",
        {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        {
            "model": "gpt-4o-mini",
            "max_tokens": 800,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"You advise Indian farmers. Answer in {lang}. "
                        "Do not invent prices, scheme amounts, or pesticide doses. "
                        "If live data is missing, say you do not know."
                    ),
                },
                {"role": "user", "content": question},
            ],
            "temperature": 0.3,
        },
    )
    return data["choices"][0]["message"]["content"], "chatgpt"


def _gemini_url():
    model = os.getenv("GEMINI_MODEL", "").strip()
    if not re.fullmatch(r"[a-zA-Z0-9.-]+", model):
        raise RuntimeError("Configure the evaluated Gemini model")
    return f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def ask_gemini(question, lang):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    data = _post_json(
        _gemini_url(),
        {"Content-Type": "application/json", "x-goog-api-key": key},
        {
            "generationConfig": {"maxOutputTokens": 800},
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                f"You advise Indian farmers. Answer in {lang}. "
                                "Do not invent prices, scheme amounts, or pesticide doses.\n\n"
                                f"{question}"
                            )
                        }
                    ]
                }
            ],
        },
    )
    return data["candidates"][0]["content"]["parts"][0]["text"], "gemini"


def ask_gemini_vision(prompt, image_b64, *, schema):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    data = _post_json(
        _gemini_url(),
        {"Content-Type": "application/json", "x-goog-api-key": key},
        {
            "generationConfig": {
                "maxOutputTokens": 800,
                "responseMimeType": "application/json",
                "responseJsonSchema": schema,
            },
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_b64,
                            }
                        },
                    ]
                }
            ],
        },
    )
    return data["candidates"][0]["content"]["parts"][0]["text"], "gemini"


def route_models(question, lang, prefer_gemini=False):
    configured = {
        ask_openai: bool(os.getenv("OPENAI_API_KEY", "").strip()),
        ask_perplexity: bool(os.getenv("PERPLEXITY_API_KEY", "").strip()),
        ask_gemini: bool(
            os.getenv("GEMINI_API_KEY", "").strip()
            and os.getenv("GEMINI_MODEL", "").strip()
        ),
    }
    if not any(configured.values()):
        raise AdvisorUnavailable(503)
    lowered = question.lower()
    if prefer_gemini or os.getenv("ADVICE_PRIMARY_PROVIDER") == "gemini":
        order = [ask_gemini, ask_openai, ask_perplexity]
    elif any(hint in lowered for hint in FRESH_HINTS):
        order = [ask_perplexity, ask_openai, ask_gemini]
    else:
        order = [ask_openai, ask_perplexity, ask_gemini]

    last_error = None
    for fn in order:
        if not configured[fn]:
            continue
        try:
            answer, model = fn(question, lang)
            if not isinstance(answer, str) or not answer.strip():
                raise ValueError("Empty advisor response")
            log_advice_result(model, "generated")
            return answer, model
        except Exception as err:
            last_error = err
            log_failure(fn.__name__, err)
            continue
    raise AdvisorUnavailable() from last_error
