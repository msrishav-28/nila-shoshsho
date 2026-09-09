import re

KNOWN_STATES = frozenset(
    {
        "all",
        "andaman and nicobar islands",
        "andhra pradesh",
        "arunachal pradesh",
        "assam",
        "bihar",
        "chandigarh",
        "chhattisgarh",
        "dadra and nagar haveli and daman and diu",
        "delhi",
        "goa",
        "gujarat",
        "haryana",
        "himachal pradesh",
        "jammu and kashmir",
        "jharkhand",
        "karnataka",
        "kerala",
        "ladakh",
        "lakshadweep",
        "madhya pradesh",
        "maharashtra",
        "manipur",
        "meghalaya",
        "mizoram",
        "nagaland",
        "odisha",
        "puducherry",
        "punjab",
        "rajasthan",
        "sikkim",
        "tamil nadu",
        "telangana",
        "tripura",
        "uttar pradesh",
        "uttarakhand",
        "west bengal",
    }
)

SAFE_STATE_RE = re.compile(r"^[a-z0-9\s.&'\-]{1,40}$")

LANG_TO_HL = {
    "english": "en",
    "hindi": "hi",
    "marathi": "mr",
    "tamil": "ta",
    "bengali": "bn",
    "kannada": "kn",
    "telugu": "te",
    "malayalam": "ml",
    "en": "en",
    "hi": "hi",
    "mr": "mr",
    "ta": "ta",
    "bn": "bn",
    "kn": "kn",
    "te": "te",
    "ml": "ml",
    "हिन्दी": "hi",
    "हिंदी": "hi",
    "मराठी": "mr",
    "தமிழ்": "ta",
    "বাংলা": "bn",
    "ಕನ್ನಡ": "kn",
    "తెలుగు": "te",
    "മലയാളം": "ml",
}


def normalize_state(raw):
    return (raw or "all").strip().lower()


def is_allowed_state(state):
    if state in KNOWN_STATES:
        return True
    return bool(SAFE_STATE_RE.match(state))


def news_hl(lang):
    text = (lang or "en").strip()
    if text in LANG_TO_HL:
        return LANG_TO_HL[text]
    lower = text.lower()
    if lower in LANG_TO_HL:
        return LANG_TO_HL[lower]
    short = lower.split("-")[0]
    return LANG_TO_HL.get(short, "en")
