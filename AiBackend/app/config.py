from pathlib import Path
import os
from dotenv import load_dotenv

ENVIRONMENT_FILE = Path(__file__).resolve().parents[2] / ".env.local"


def load_environment():
    load_dotenv(ENVIRONMENT_FILE, override=False, interpolate=False)


def redis_namespace():
    return "nila:staging" if os.getenv("STAGING_ACCESS_KEY") else "nila"
