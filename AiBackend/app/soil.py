def _as_number(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number:
        return None
    return number


def _depth_key(raw):
    text = str(raw or "").lower().replace(" ", "")
    text = text.replace("_", "-")
    return text


def _mean_from_depths(depths, wanted):
    if not isinstance(depths, list):
        return None
    wanted_key = _depth_key(wanted)
    for row in depths:
        if not isinstance(row, dict):
            continue
        label = _depth_key(row.get("range") or row.get("label") or row.get("depth") or "")
        if wanted_key not in label and label not in wanted_key:
            continue
        values = row.get("values") if isinstance(row.get("values"), dict) else row
        mean = _as_number(values.get("mean"))
        if mean is not None:
            return mean
    return None


def _layer_name(layer):
    if not isinstance(layer, dict):
        return ""
    return str(layer.get("name") or layer.get("property") or "").strip().lower()


def _layers_from_payload(data):
    if not isinstance(data, dict):
        return []
    props = data.get("properties")
    if isinstance(props, dict) and isinstance(props.get("layers"), list):
        return props["layers"]
    if isinstance(data.get("layers"), list):
        return data["layers"]
    if isinstance(props, list):
        return props
    return []


def _apply_factor(layer, value):
    if value is None or not isinstance(layer, dict):
        return value
    unit = layer.get("unit_measure") if isinstance(layer.get("unit_measure"), dict) else {}
    factor = _as_number(unit.get("d_factor"))
    name = _layer_name(layer)
    if name == "phh2o" and value > 14 and (factor == 10 or factor is None):
        return value / 10.0
    if factor and factor > 1 and name in {"nitrogen", "soc", "clay"} and value > 100:
        return value / factor
    return value


def parse_soil_payload(data):
    layers = _layers_from_payload(data)
    by_name = {}
    for layer in layers:
        name = _layer_name(layer)
        if name:
            by_name[name] = layer

    def pick(names, depth):
        for name in names:
            layer = by_name.get(name)
            if not layer:
                continue
            mean = None
            if isinstance(layer.get("depths"), list):
                mean = _mean_from_depths(layer["depths"], depth)
            if mean is None:
                depth_field = layer.get("depth_0_5") if depth.startswith("0-5") else layer.get("depth_0_30")
                if isinstance(depth_field, dict):
                    mean = _as_number(depth_field.get("mean"))
            if mean is None:
                mean = _as_number(layer.get("mean"))
            mean = _apply_factor(layer, mean)
            if mean is not None:
                return mean
        return None

    soil = {
        "soil_ph": pick(("phh2o", "ph"), "0-5cm"),
        "soil_organic_carbon": pick(("soc", "organic_carbon"), "0-5cm"),
        "soil_nitrogen": pick(("nitrogen", "n"), "0-5cm"),
        "soil_clay": pick(("clay",), "0-5cm"),
        "soil_organic_carbon_stock": pick(("ocs", "ocd"), "0-30cm"),
    }
    required = ("soil_ph", "soil_organic_carbon", "soil_nitrogen", "soil_clay")
    if any(soil.get(key) is None for key in required):
        return None
    return soil
