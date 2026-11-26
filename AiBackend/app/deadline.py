import time
from flask import g, has_request_context
from requests.exceptions import Timeout


def provider_timeout(maximum):
    """Give sequential provider calls the time remaining on this farmer's request."""
    if not has_request_context() or not hasattr(g, "started"):
        return maximum
    remaining = 45 - (time.monotonic() - g.started)
    if remaining <= 0:
        raise Timeout("Advice request deadline reached")
    return min(remaining, maximum)
