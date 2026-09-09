from app.soil import parse_soil_payload


def test_parses_soilgrids_layers_and_scales_ph():
    payload = {
        "properties": {
            "layers": [
                {
                    "name": "phh2o",
                    "unit_measure": {"d_factor": 10},
                    "depths": [{"range": "0-5cm", "values": {"mean": 62}}],
                },
                {
                    "name": "soc",
                    "depths": [{"range": "0-5cm", "values": {"mean": 1.2}}],
                },
                {
                    "name": "nitrogen",
                    "depths": [{"range": "0-5cm", "values": {"mean": 0.08}}],
                },
                {
                    "name": "clay",
                    "depths": [{"range": "0-5cm", "values": {"mean": 28}}],
                },
            ]
        }
    }
    soil = parse_soil_payload(payload)
    assert soil["soil_ph"] == 6.2
    assert soil["soil_organic_carbon"] == 1.2
    assert soil["soil_nitrogen"] == 0.08
    assert soil["soil_clay"] == 28


def test_parses_legacy_property_list():
    payload = {
        "properties": [
            {"property": "phh2o", "depth_0_5": {"mean": 6.8}},
            {"property": "soc", "depth_0_5": {"mean": 0.9}},
            {"property": "nitrogen", "depth_0_5": {"mean": 0.1}},
            {"property": "clay", "depth_0_5": {"mean": 22}},
        ]
    }
    soil = parse_soil_payload(payload)
    assert soil["soil_ph"] == 6.8


def test_rejects_incomplete_payload():
    assert parse_soil_payload({"properties": {"layers": []}}) is None
    assert parse_soil_payload("<html>nope</html>") is None
