import os
import requests

TIMEOUT = 45
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


def _post_json(url, headers, payload):
    response = requests.post(url, headers=headers, json=payload, timeout=TIMEOUT)
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


def ask_gemini(question, lang):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    data = _post_json(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}",
        {"Content-Type": "application/json"},
        {
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
            ]
        },
    )
    return data["candidates"][0]["content"]["parts"][0]["text"], "gemini"


def ask_gemini_vision(prompt, image_b64, mime="image/jpeg"):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    data = _post_json(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}",
        {"Content-Type": "application/json"},
        {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime or "image/jpeg",
                                "data": image_b64,
                            }
                        },
                    ]
                }
            ]
        },
    )
    return data["candidates"][0]["content"]["parts"][0]["text"], "gemini"


def route_models(question, lang, prefer_gemini=False):
    lowered = question.lower()
    if prefer_gemini:
        order = [ask_gemini, ask_openai, ask_perplexity]
    elif any(hint in lowered for hint in FRESH_HINTS):
        order = [ask_perplexity, ask_openai, ask_gemini]
    else:
        order = [ask_openai, ask_perplexity, ask_gemini]

    last_error = None
    for fn in order:
        try:
            return fn(question, lang)
        except Exception as err:
            last_error = err
            continue
    raise last_error or RuntimeError("All advisors failed")
