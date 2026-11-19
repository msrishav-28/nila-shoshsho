import json
import logging
from flask import current_app, g, has_request_context, request


class SafeFormatter(logging.Formatter):
    def format(self, record):
        fields = getattr(record, "event_fields", None)
        if fields is None:
            fields = {
                "event": "application_error"
                if record.levelno >= logging.ERROR
                else "application_event"
            }
        result = {"level": record.levelname.lower(), **fields}
        if record.exc_info:
            result["error_class"] = record.exc_info[0].__name__
        return json.dumps(result)


def configure_logging(logger):
    handler = logging.StreamHandler()
    handler.setFormatter(SafeFormatter())
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


def log_advice_result(provider, outcome):
    if has_request_context():
        current_app.logger.info(
            "advice_result",
            extra={
                "event_fields": {
                    "event": "advice_result",
                    "request_id": g.get("request_id"),
                    "route": request.url_rule.rule if request.url_rule else "unmatched",
                    "provider": provider,
                    "outcome": outcome,
                }
            },
        )


def log_failure(provider, error):
    if has_request_context():
        current_app.logger.warning(
            "provider_failure",
            extra={
                "event_fields": {
                    "event": "provider_failure",
                    "provider": provider,
                    "error_class": type(error).__name__,
                    "request_id": g.get("request_id"),
                }
            },
        )
