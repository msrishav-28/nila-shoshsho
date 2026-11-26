FEATURES = (
    {
        "id": "schemes",
        "title": "Government schemes",
        "route": "Scheme",
        "keywords": ("scheme", "subsidy", "yojana", "loan", "kisan"),
    },
    {
        "id": "crop-care",
        "title": "Crop care",
        "route": "Crop Care",
        "keywords": ("disease", "leaf", "pest", "crop care", "photo"),
    },
    {
        "id": "market",
        "title": "Market prices",
        "route": "Market",
        "keywords": ("price", "mandi", "market", "sell"),
    },
    {
        "id": "stores",
        "title": "Nearby stores",
        "route": "Stores",
        "keywords": ("store", "shop", "fertilizer shop", "nearby"),
    },
    {
        "id": "compare",
        "title": "Price compare",
        "route": "Compare",
        "keywords": ("compare", "difference", "two states"),
    },
    {
        "id": "insights",
        "title": "Market insights",
        "route": "Insights",
        "keywords": ("insight", "forecast", "trend"),
    },
    {
        "id": "news",
        "title": "Agriculture news",
        "route": "News",
        "keywords": ("news", "headline"),
    },
    {
        "id": "fertilizer",
        "title": "Fertilizer advice",
        "route": "Fertilizers",
        "keywords": ("fertilizer", "urea", "npk", "soil"),
    },
    {
        "id": "water",
        "title": "Water management",
        "route": "WaterManagement",
        "keywords": ("water", "irrigation", "sprinkler"),
    },
    {
        "id": "harvest",
        "title": "Post harvest",
        "route": "PostHarvest",
        "keywords": ("harvest", "storage", "drying"),
    },
    {
        "id": "calendar",
        "title": "Crop calendar",
        "route": "CropSuggestion",
        "keywords": ("calendar", "week", "sowing"),
    },
    {
        "id": "chatbot",
        "title": "Farming chatbot",
        "route": "Chatbot",
        "keywords": ("chat", "ask", "advice", "question"),
    },
    {
        "id": "documents",
        "title": "Documents",
        "route": "Documents",
        "keywords": ("pdf", "document", "translate"),
    },
    {
        "id": "logistics",
        "title": "Logistics jobs",
        "route": "Logistics",
        "keywords": ("logistics", "transport", "pickup", "lorry"),
    },
    {
        "id": "weather",
        "title": "Weather",
        "route": "Home",
        "keywords": ("weather", "rain", "heat", "forecast"),
    },
    {
        "id": "notifications",
        "title": "Notifications",
        "route": "Notifications",
        "keywords": ("alert", "bell", "notification"),
    },
)


def match_features(query):
    text = (query or "").strip().lower()
    if not text:
        return list(FEATURES)
    hits = []
    for feature in FEATURES:
        blob = " ".join((feature["title"].lower(), *feature["keywords"]))
        if text in blob:
            hits.append(feature)
    return hits
