from flask import Blueprint, jsonify, request
import re
import requests
from app.deadline import provider_timeout
from app.farmer_context import farmer_profile
from app.live_data import reverse_state
from app.mandi import fetch_mandi_page, MarketError

stores_bp = Blueprint("stores", __name__)
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
TIMEOUT = 25


@stores_bp.route("/stores/nearby", methods=["GET"])
def nearby_stores():
    profile = farmer_profile()
    try:
        lat = float(
            request.args.get("lat")
            if request.args.get("lat") not in (None, "")
            else profile.get("lat") or 0
        )
        lon = float(
            request.args.get("lon")
            if request.args.get("lon") not in (None, "")
            else profile.get("lon") or 0
        )
    except (TypeError, ValueError):
        return jsonify({"error": "lat and lon are required numbers"}), 400
    if not (-90 <= lat <= 90 and -180 <= lon <= 180) or (lat == 0 and lon == 0):
        return jsonify({"error": "lat and lon are required numbers"}), 400

    radius = 15000
    query = (
        f"[out:json][timeout:20];("
        f'node["shop"="agrarian"](around:{radius},{lat},{lon});'
        f'node["shop"="farm"](around:{radius},{lat},{lon});'
        f'node["shop"="garden_centre"](around:{radius},{lat},{lon});'
        f'node["amenity"="marketplace"](around:{radius},{lat},{lon});'
        f'way["shop"="agrarian"](around:{radius},{lat},{lon});'
        f'way["amenity"="marketplace"](around:{radius},{lat},{lon});'
        f");out center 40;"
    )
    try:
        response = requests.post(
            OVERPASS_URL, data={"data": query}, timeout=provider_timeout(TIMEOUT)
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or not isinstance(
            payload.get("elements"), list
        ):
            raise ValueError("Invalid map response")
    except (requests.RequestException, ValueError):
        return jsonify({"error": "Store map is unavailable"}), 502

    stores = []
    for element in payload["elements"][:40]:
        if not isinstance(element, dict):
            continue
        tags = element.get("tags") if isinstance(element.get("tags"), dict) else {}
        center = (
            element.get("center") if isinstance(element.get("center"), dict) else {}
        )
        store_lat = element.get("lat") or center.get("lat")
        store_lon = element.get("lon") or center.get("lon")
        if (
            type(store_lat) not in (int, float)
            or type(store_lon) not in (int, float)
            or not (-90 <= store_lat <= 90 and -180 <= store_lon <= 180)
        ):
            continue
        phone = tags.get("phone") or tags.get("contact:phone") or ""
        phone = (
            phone
            if isinstance(phone, str) and re.fullmatch(r"[+0-9 ()-]{5,30}", phone)
            else ""
        )
        stores.append(
            {
                "id": str(element.get("id")),
                "name": tags.get("name") or "Farm supply",
                "type": tags.get("shop") or tags.get("amenity") or "store",
                "address": tags.get("addr:full")
                or " ".join(
                    part
                    for part in [
                        tags.get("addr:housenumber"),
                        tags.get("addr:street"),
                        tags.get("addr:city"),
                    ]
                    if part
                ),
                "phone": phone,
                "lat": store_lat,
                "lon": store_lon,
                "mapsUrl": (
                    f"https://www.openstreetmap.org/?mlat={store_lat}&mlon={store_lon}"
                    f"#map=17/{store_lat}/{store_lon}"
                ),
                "telUrl": f"tel:{phone}" if phone else "",
            }
        )

    state = (request.args.get("state") or profile.get("state") or "").strip()
    if not state:
        state = reverse_state(lat, lon)
    mandi_error = None
    mandis = []
    if state:
        try:
            rows = fetch_mandi_page(state=state, limit=20)["records"]
        except MarketError as err:
            rows = []
            mandi_error = str(err)
        for row in rows:
            mandis.append(
                {
                    "name": row.get("market") or "Mandi",
                    "district": row.get("district") or "",
                    "state": row.get("state") or "",
                    "commodity": row.get("commodity") or "",
                    "modal_price": row.get("modal_price"),
                    "unit": row.get("unit") or "Rs/quintal",
                    "source": row.get("source") or "AGMARKNET via data.gov.in",
                    "asOf": row.get("asOf") or row.get("arrival_date") or "",
                }
            )

    return jsonify(
        {
            "stores": stores,
            "mandis": mandis,
            "mandiError": mandi_error,
            "state": state,
            "storeSource": "OpenStreetMap",
            "mandiSource": "AGMARKNET via data.gov.in",
        }
    )
