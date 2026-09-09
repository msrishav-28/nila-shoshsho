from flask import Flask, jsonify, request
from flask_cors import CORS
from app.security import check_rate_limit, cors_origins

def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024
    origins = cors_origins()
    CORS(
        app,
        supports_credentials=True,
        origins=origins,
        allow_headers=["Content-Type", "Authorization"],
    )

    @app.get("/health")
    def health():
        return jsonify({"ok": True})

    @app.before_request
    def require_login():
        if request.method == "OPTIONS":
            return None
        if request.path in ("/health", "/"):
            return None
        limited = check_rate_limit()
        if limited:
            return limited
        from app.auth import current_user_id

        user_id, error = current_user_id()
        if error:
            message, status = error
            return jsonify({"error": message}), status
        request.farmer_id = user_id
        return None

    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.errorhandler(413)
    def too_large(_err):
        return jsonify({"error": "File is too large"}), 413

    @app.errorhandler(500)
    def server_error(_err):
        return jsonify({"error": "Something went wrong. Please try again."}), 500

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
