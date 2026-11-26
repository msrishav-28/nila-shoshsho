import os
from datetime import datetime, timezone
from urllib.parse import urlsplit
from flask import Blueprint, jsonify, request
import requests
from app.deadline import provider_timeout
from app.cache import cached_data
from app.news_filters import is_allowed_state, news_hl, normalize_state


class NewsUnavailable(Exception):
    pass


news_bp = Blueprint("news", __name__)

SERP_URL = "https://serpapi.com/search"
REQUEST_TIMEOUT_SECONDS = 20
MAX_SEARCH_LEN = 120

ALLOWED_CATEGORIES = frozenset(
    {"all", "crops", "weather", "market", "technology", "government"}
)


def _build_query(category, state, search):
    parts = ["latest agriculture news india farmers"]
    if category != "all":
        parts.append(category)
    if state != "all":
        parts.append(state)
    if search:
        parts.append(search)
    return " ".join(parts)


def _web_url(raw):
    if not isinstance(raw, str):
        return None
    try:
        url = urlsplit(raw)
        if (
            url.scheme in ("http", "https")
            and url.hostname
            and not url.username
            and not url.password
        ):
            return raw
    except ValueError:
        return None
    return None


def _articles(results):
    articles = []
    seen = set()
    for group in results[:50]:
        if not isinstance(group, dict):
            continue
        stories = group.get("stories")
        candidates = [group, group.get("highlight")] + (
            stories[:20] if isinstance(stories, list) else []
        )
        for row in candidates:
            if not isinstance(row, dict):
                continue
            link = _web_url(row.get("link"))
            source = row.get("source")
            if (
                not link
                or link in seen
                or not row.get("title")
                or not isinstance(source, dict)
                or not source.get("name")
            ):
                continue
            try:
                published = datetime.fromisoformat(
                    row.get("iso_date") or row.get("published_date") or ""
                )
            except (ValueError, TypeError):
                continue
            if published.tzinfo is None or published > datetime.now(timezone.utc):
                continue
            seen.add(link)
            articles.append(
                {
                    "title": row["title"],
                    "link": link,
                    "snippet": row.get("snippet") or "",
                    "published_date": published.isoformat(),
                    "thumbnail": _web_url(row.get("thumbnail")),
                    "source": {
                        "name": source["name"],
                        "icon": _web_url(source.get("icon")),
                    },
                }
            )
            if len(articles) == 20:
                return articles
    return articles


@news_bp.route("/news", methods=["GET"])
def get_news():
    api_key = os.getenv("SERP_API_KEY")
    if not api_key:
        return jsonify({"error": "News service is not configured"}), 503

    category = (request.args.get("category") or "all").strip().lower()
    state = normalize_state(request.args.get("state"))
    search = (request.args.get("search") or "").strip()
    lang = (request.args.get("lang") or "en").strip()

    if category not in ALLOWED_CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400
    if not is_allowed_state(state):
        return jsonify({"error": "Invalid state"}), 400
    if len(search) > MAX_SEARCH_LEN:
        return jsonify({"error": "Search is too long"}), 400

    hl = news_hl(lang)
    query = _build_query(category, state, search)

    try:
        articles, status = cached_data(
            "news", [query, hl], lambda: _load_news(api_key, query, hl), 14400
        )
    except NewsUnavailable as error:
        return jsonify(error=str(error)), 502
    if status != 200:
        return jsonify(error=articles), status
    return jsonify(news_results=articles)


def _load_news(api_key, query, hl):
    try:
        response = requests.get(
            SERP_URL,
            params={
                "api_key": api_key,
                "engine": "google_news",
                "q": query,
                "tbm": "nws",
                "num": 20,
                "gl": "in",
                "hl": hl,
            },
            timeout=provider_timeout(REQUEST_TIMEOUT_SECONDS),
        )
    except requests.RequestException:
        raise NewsUnavailable("News service is unavailable")

    if response.status_code != 200:
        raise NewsUnavailable("News service is unavailable")

    try:
        payload = response.json()
    except ValueError:
        raise NewsUnavailable("Invalid news service response")
    results = payload.get("news_results") if isinstance(payload, dict) else None
    if not isinstance(results, list):
        raise NewsUnavailable("Invalid news service response")

    articles = _articles(results)
    if results and not articles:
        raise NewsUnavailable("News service returned no verifiable articles")
    return articles, 200
