import os
import re
from flask import Blueprint, jsonify, request
import requests

market_prices_bp = Blueprint("market_prices", __name__)

DATA_GOV_URL = (
    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
)
from app.llm import route_models

REQUEST_TIMEOUT_SECONDS = 20
FILTER_VALUE_RE = re.compile(r"^[\w\s().'\-/]+$")
MAX_FILTER_LEN = 80
MAX_ANALYSIS_RECORDS = 50


def _parse_bounded_int(value, default, minimum, maximum):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def _clean_filter(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text or len(text) > MAX_FILTER_LEN:
        return None
    if not FILTER_VALUE_RE.match(text):
        return None
    return text


def _safe_record(record):
    if not isinstance(record, dict):
        return None
    return {
        "commodity": record.get("commodity"),
        "variety": record.get("variety"),
        "market": record.get("market"),
        "district": record.get("district"),
        "state": record.get("state"),
        "arrival_date": record.get("arrival_date"),
        "min_price": record.get("min_price"),
        "max_price": record.get("max_price"),
        "modal_price": record.get("modal_price"),
        "unit": "Rs/quintal",
        "source": "AGMARKNET via data.gov.in",
        "asOf": record.get("arrival_date") or "",
    }


@market_prices_bp.route("/api/market-prices", methods=["GET"])
def get_market_prices():
    api_key = os.getenv("DATA_GOV_API_KEY")
    if not api_key:
        return jsonify({"error": "Market price service is not configured"}), 503

    offset = _parse_bounded_int(request.args.get("offset"), 0, 0, 10000)
    limit = _parse_bounded_int(request.args.get("limit"), 10, 1, 50)

    params = {
        "api-key": api_key,
        "format": "json",
        "offset": offset,
        "limit": limit,
    }
    state = _clean_filter(request.args.get("state"))
    district = _clean_filter(request.args.get("district"))
    commodity = _clean_filter(request.args.get("commodity"))
    if state:
        params["filters[state]"] = state
    if district:
        params["filters[district]"] = district
    if commodity:
        params["filters[commodity]"] = commodity

    try:
        response = requests.get(
            DATA_GOV_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS
        )
    except requests.RequestException:
        return jsonify({"error": "Market price service is unavailable"}), 502

    if response.status_code != 200:
        return jsonify({"error": "Market price service is unavailable"}), 502

    payload = response.json()
    raw_records = payload.get("records") or []
    records = [item for item in (_safe_record(row) for row in raw_records) if item]
    total = payload.get("total", len(records))

    return jsonify(
        {
            "records": records,
            "total": total,
            "source": "AGMARKNET via data.gov.in",
        }
    ), 200


@market_prices_bp.route("/api/market-analysis", methods=["POST"])
def get_market_analysis():

    body = request.get_json(silent=True) or {}
    raw_records = body.get("records")
    if not isinstance(raw_records, list) or len(raw_records) == 0:
        return jsonify({"error": "records must be a non-empty list"}), 400
    if len(raw_records) > MAX_ANALYSIS_RECORDS:
        return jsonify({"error": "Too many records"}), 400

    records = [item for item in (_safe_record(row) for row in raw_records) if item]
    if not records:
        return jsonify({"error": "No usable market records"}), 400

    first = records[0]
    commodity = first.get("commodity") or "commodity"
    variety = first.get("variety") or ""
    market_name = first.get("market") or "market"
    district = first.get("district") or ""
    state = first.get("state") or ""

    modal_prices = []
    for row in records:
        try:
            modal_prices.append(float(row.get("modal_price")))
        except (TypeError, ValueError):
            continue
    if not modal_prices:
        return jsonify({"error": "No usable prices"}), 400

    min_price = min(modal_prices)
    max_price = max(modal_prices)
    avg_price = sum(modal_prices) / len(modal_prices)
    arrival_dates = sorted(
        {row.get("arrival_date") for row in records if row.get("arrival_date")}
    )
    date_range = (
        f"{arrival_dates[0]} to {arrival_dates[-1]}" if arrival_dates else "unknown date range"
    )
    variety_bit = f" ({variety})" if variety else ""

    prompt = (
        f"You are commenting only on these live mandi rows for {commodity} in {market_name}.\n"
        "1. Say whether the listed modal prices look higher, lower, or mixed across these rows.\n"
        "2. Mention only factors that can be inferred from these rows (crop, market, date, min/max/modal).\n"
        "3. Do not invent a two-week forecast, future prices, or arrivals that are not in the rows.\n"
        "4. If the farmer asks whether to sell, say it depends on these live rows and local costs, not a prediction.\n\n"
        "Market Data Summary:\n"
        f"- Commodity: {commodity}{variety_bit}\n"
        f"- Market: {market_name}, {district}, {state}\n"
        f"- Price Range: Rs {min_price:.2f} to Rs {max_price:.2f} per quintal\n"
        f"- Average Price: Rs {avg_price:.2f} per quintal\n"
        f"- Date Range: {date_range}\n"
        f"- Data Points: {len(records)} records\n\n"
        "Comment on these live rows only. Do not invent prices. Keep under 150 words."
    )
    try:
        analysis, model = route_models(prompt, "English")
    except Exception:
        return jsonify({"error": "Market analysis is unavailable"}), 502
    if not analysis:
        return jsonify({"error": "Market analysis is unavailable"}), 502
    return jsonify(
        {
            "analysis": analysis,
            "model": model,
            "source": "AGMARKNET via data.gov.in",
            "asOf": date_range,
        }
    ), 200


@market_prices_bp.route("/api/market-compare", methods=["GET"])
def compare_market_prices():
    api_key = os.getenv("DATA_GOV_API_KEY")
    if not api_key:
        return jsonify({"error": "Market price service is not configured"}), 503

    commodity = _clean_filter(request.args.get("commodity"))
    left_state = _clean_filter(request.args.get("state_a"))
    right_state = _clean_filter(request.args.get("state_b"))
    if not commodity or not left_state or not right_state:
        return jsonify({"error": "commodity, state_a, and state_b are required"}), 400

    def fetch_state(state_name):
        params = {
            "api-key": api_key,
            "format": "json",
            "limit": 10,
            "offset": 0,
            "filters[state]": state_name,
            "filters[commodity]": commodity,
        }
        response = requests.get(
            DATA_GOV_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS
        )
        if response.status_code != 200:
            return []
        raw = response.json().get("records") or []
        return [item for item in (_safe_record(row) for row in raw) if item]

    try:
        left = fetch_state(left_state)
        right = fetch_state(right_state)
    except requests.RequestException:
        return jsonify({"error": "Market compare is unavailable"}), 502

    return jsonify(
        {
            "commodity": commodity,
            "state_a": {"state": left_state, "records": left},
            "state_b": {"state": right_state, "records": right},
            "source": "AGMARKNET via data.gov.in",
            "unit": "Rs/quintal",
        }
    ), 200
