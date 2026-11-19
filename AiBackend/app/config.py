from pathlib import Path
from dotenv import load_dotenv

ENVIRONMENT_FILE = Path(__file__).resolve().parents[2] / ".env.local"


def load_environment():
    load_dotenv(ENVIRONMENT_FILE, override=False, interpolate=False)
