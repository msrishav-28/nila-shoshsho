from flask import Blueprint, jsonify, request
import requests
from app.farmer_context import farmer_profile
from app.live_data import fetch_mandi_records, reverse_state

stores_bp = Blueprint("stores", __name__)
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
TIMEOUT = 25


@stores_bp.route("/stores/nearby", methods=["GET"])
def nearby_stores():
    profile = farmer_profile()
    try:
        lat = float(request.args.get("lat") if request.args.get("lat") not in (None, "") else profile.get("lat") or 0)
        lon = float(request.args.get("lon") if request.args.get("lon") not in (None, "") else profile.get("lon") or 0)
    except (TypeError, ValueError):
        return jsonify({"error": "lat and lon are required numbers"}), 400
    if not lat or not lon:
        return jsonify({"error": "lat and lon are required numbers"}), 400

    radius = 15000
    query = (
        f'[out:json][timeout:20];('
        f'node["shop"="agrarian"](around:{radius},{lat},{lon});'
        f'node["shop"="farm"](around:{radius},{lat},{lon});'
        f'node["shop"="garden_centre"](around:{radius},{lat},{lon});'
        f'node["amenity"="marketplace"](around:{radius},{lat},{lon});'
        f'way["shop"="agrarian"](around:{radius},{lat},{lon});'
        f'way["amenity"="marketplace"](around:{radius},{lat},{lon});'
        f');out center 40;'
    )
    try:
        response = requests.post(
            OVERPASS_URL, data={"data": query}, timeout=TIMEOUT
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException:
        return jsonify({"error": "Store map is unavailable"}), 502

    stores = []
    for element in payload.get("elements") or []:
        tags = element.get("tags") or {}
        center = element.get("center") or {}
        store_lat = element.get("lat") or center.get("lat")
        store_lon = element.get("lon") or center.get("lon")
        if store_lat is None or store_lon is None:
            continue
        phone = tags.get("phone") or tags.get("contact:phone") or ""
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
    mandis = []
    if state:
        rows = fetch_mandi_records(state=state, limit=20) or []
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
            "state": state,
            "storeSource": "OpenStreetMap",
            "mandiSource": "AGMARKNET via data.gov.in",
        }
    )
