import time
import uuid
import math

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from app.config import load_environment
from werkzeug.exceptions import HTTPException
from app.mandi import MarketError
from app.farmer_context import ProfileUnavailable
from app.logging_config import configure_logging
from app.security import (
    check_rate_limit,
    cors_origins,
    disabled_advice_path,
    staging_authorized,
)


def create_app():
    load_environment()
    app = Flask(__name__)
    configure_logging(app.logger)
    app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024
    app.config["MAX_FORM_MEMORY_SIZE"] = 16000
    app.config["MAX_FORM_PARTS"] = 10
    origins = cors_origins()
    CORS(
        app,
        supports_credentials=True,
        origins=origins,
        allow_headers=["Content-Type", "Authorization", "X-Staging-Key"],
    )

    @app.get("/health")
    def health():
        return jsonify({"ok": True})

    @app.before_request
    def require_login():
        g.started = time.monotonic()
        g.request_id = str(uuid.uuid4())
        if request.method == "OPTIONS":
            return None
        if request.path in ("/health", "/"):
            return None
        if not staging_authorized():
            return jsonify(error="Not found", code="not_found"), 404
        limited = check_rate_limit()
        if limited:
            return limited
        from app.auth import current_user_id

        user_id, error = current_user_id()
        if error:
            message, status = error
            return jsonify({"error": message}), status
        if request.is_json and request.method in ("POST", "PUT", "PATCH"):
            payload = request.get_json(silent=True)
            if not isinstance(payload, dict):
                return jsonify(error="Expected a JSON object"), 400
            strings = (
                "question",
                "query",
                "crop",
                "region",
                "state",
                "lang",
                "harvest_date",
                "soil_type",
                "irrigation_method",
            )
            for field in strings:
                value = payload.get(field)
                if value is not None and (
                    not isinstance(value, str)
                    or len(value) > (2000 if field == "question" else 160)
                ):
                    return jsonify(error=f"Invalid {field}"), 400
            for field, bound in (
                ("lat", 90),
                ("latitude", 90),
                ("lon", 180),
                ("longitude", 180),
            ):
                value = payload.get(field)
                if value is not None and (
                    type(value) not in (int, float)
                    or not math.isfinite(value)
                    or abs(value) > bound
                ):
                    return jsonify(error="Invalid coordinates"), 400
        request.farmer_id = user_id
        from app.farmer_context import authenticated_profile

        g.farmer_profile = authenticated_profile()
        if disabled_advice_path():
            return jsonify(
                error="This feature is temporarily unavailable", code="feature_disabled"
            ), 503
        return check_rate_limit(user_id)

    @app.after_request
    def add_security_headers(response):
        response.headers["X-Request-ID"] = g.request_id
        response.headers["Cache-Control"] = "private, no-store"
        app.logger.info(
            "request",
            extra={
                "event_fields": {
                    "event": "request",
                    "request_id": g.request_id,
                    "route": request.url_rule.rule if request.url_rule else "unmatched",
                    "status": response.status_code,
                    "ms": int((time.monotonic() - g.started) * 1000),
                }
            },
        )
        if response.status_code >= 400 and response.is_json:
            payload = response.get_json()
            if (
                isinstance(payload, dict)
                and "error" in payload
                and "code" not in payload
            ):
                codes = {
                    400: "invalid_input",
                    401: "unauthorized",
                    403: "forbidden",
                    404: "not_found",
                    413: "too_large",
                    422: "insufficient_evidence",
                    429: "rate_limited",
                    500: "internal_error",
                    502: "upstream_failure",
                    503: "service_unavailable",
                }
                payload["code"] = codes.get(response.status_code, "request_failed")
                response.set_data(app.json.dumps(payload))
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.errorhandler(ProfileUnavailable)
    def profile_error(err):
        return jsonify(error=str(err)), err.status

    @app.errorhandler(MarketError)
    def market_error(err):
        return jsonify(error=str(err)), err.status

    @app.errorhandler(413)
    def too_large(_err):
        return jsonify({"error": "File is too large"}), 413

    @app.errorhandler(500)
    def server_error(_err):
        return jsonify({"error": "Something went wrong. Please try again."}), 500

    @app.errorhandler(HTTPException)
    def request_error(err):
        return jsonify(error=err.name), err.code

    # Register blueprints
    from app.routes.govscheme import govscheme_bp
    from app.routes.translate import translate_bp
    from app.routes.plant_disease import plant_disease_bp
    from app.routes.postharvest import postharvest_bp
    from app.routes.fertilizer import fertilizer_bp
    from app.routes.crop_suggestion import crop_suggestion_bp
    from app.routes.crop_calendar import crop_calendar_bp
    from app.routes.water_management import water_management_bp
    from app.routes.news import news_bp
    from app.routes.market_prices import market_prices_bp
    from app.routes.chatbot import chatbot_bp
    from app.routes.stores import stores_bp
    from app.routes.voice import voice_bp
    from app.routes.insights import insights_bp
    from app.routes.search import search_bp
    from app.routes.weather import weather_bp

    app.register_blueprint(govscheme_bp)
    app.register_blueprint(translate_bp)
    app.register_blueprint(plant_disease_bp)
    app.register_blueprint(postharvest_bp)
    app.register_blueprint(fertilizer_bp)
    app.register_blueprint(crop_suggestion_bp)
    app.register_blueprint(crop_calendar_bp)
    app.register_blueprint(water_management_bp)
    app.register_blueprint(news_bp)
    app.register_blueprint(market_prices_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(stores_bp)
    app.register_blueprint(voice_bp)
    app.register_blueprint(insights_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(weather_bp)

    return app
