from datetime import datetime
from flask import Blueprint, jsonify, request

from app.llm import route_models
from app.mandi import SOURCE, fetch_mandi_page, normalize_record

market_prices_bp = Blueprint("market_prices", __name__)
MAX_ANALYSIS_RECORDS = 50


def _parse_bounded_int(value, default, minimum, maximum):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


@market_prices_bp.route("/api/market-prices", methods=["GET"])
def get_market_prices():
    offset = _parse_bounded_int(request.args.get("offset"), 0, 0, 10000)
    limit = _parse_bounded_int(request.args.get("limit"), 10, 1, 50)
    page = fetch_mandi_page(
        request.args.get("commodity"),
        request.args.get("state"),
        request.args.get("district"),
        limit,
        offset,
    )
    return jsonify(page)


@market_prices_bp.route("/api/market-analysis", methods=["POST"])
def get_market_analysis():
    body = request.get_json(silent=True)
    rows = body.get("records") if isinstance(body, dict) else None
    if not isinstance(rows, list) or not 1 <= len(rows) <= MAX_ANALYSIS_RECORDS:
        return jsonify(error="Supply between 1 and 50 market records"), 400
    source = "Submitted market records"
    try:
        records = [normalize_record(row, source) for row in rows]
        units = {row["unit"] for row in records}
        if len(units) != 1:
            return jsonify(error="Choose records using the same price unit"), 400
        prices = [
            float(row["modal_price"])
            for row in records
            if row["modal_price"] not in (None, "")
        ]
        dates = []
        for row in records:
            value = row["arrival_date"]
            if value:
                if not isinstance(value, str):
                    raise ValueError("Invalid arrival date")
                fmt = "%Y-%m-%d" if "-" in value and value[:4].isdigit() else "%d/%m/%Y"
                dates.append(datetime.strptime(value, fmt).date())
    except (ValueError, TypeError, OverflowError):
        return jsonify(error="Invalid price, date or market record"), 400
    if not prices:
        return jsonify(error="No usable prices"), 400
    date_range = f"{min(dates)} to {max(dates)}" if dates else "unknown date range"
    unit = units.pop()
    analysis = (
        f"Across {len(prices)} submitted observations, modal prices range from "
        f"{min(prices):.2f} to {max(prices):.2f} {unit}. "
        f"The unweighted average is {sum(prices) / len(prices):.2f} {unit}."
    )
    try:
        comment, model = route_models(
            "Explain this summary of user-submitted observations in under 100 words. "
            "No forecasts, sales recommendations, causes or claims of official provenance. "
            f"{analysis} Date range: {date_range}",
            "English",
        )
    except (RuntimeError, TimeoutError, ValueError, KeyError, IndexError, OSError):
        comment, model = None, None
    if isinstance(comment, str) and comment.strip():
        analysis = analysis + " " + comment.strip()
    return jsonify(analysis=analysis, model=model, source=source, asOf=date_range)


@market_prices_bp.route("/api/market-compare", methods=["GET"])
def compare_market_prices():
    commodity = request.args.get("commodity")
    left = request.args.get("state_a")
    right = request.args.get("state_b")
    if not all((commodity, left, right)):
        return jsonify(error="commodity, state_a, and state_b are required"), 400
    left_rows = fetch_mandi_page(commodity, left)["records"]
    right_rows = fetch_mandi_page(commodity, right)["records"]
    units = {row["unit"] for row in left_rows + right_rows}
    if len(units) > 1:
        return jsonify(error="Market records have different units"), 422
    return jsonify(
        commodity=commodity,
        state_a={"state": left, "records": left_rows},
        state_b={"state": right, "records": right_rows},
        source=SOURCE,
        unit=next(iter(units), "Rs/quintal"),
    )
