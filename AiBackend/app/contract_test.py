import json
from pathlib import Path

from openapi_spec_validator import validate


def test_openapi_is_valid_and_covers_the_current_route_inventory():
    root = Path(__file__).resolve().parents[2] / "backend"
    specification = json.loads((root / "openapi.json").read_text())
    validate(specification)
    inventory = json.loads((root / "api-contract.json").read_text())
    expected = {
        (
            route["path"]
            .replace(":id", "{id}")
            .replace(":userId", "{userId}")
            .replace(":plotId", "{plotId}")
            .replace(":kind", "{kind}"),
            route["method"].lower(),
        )
        for route in inventory["routes"]
    }
    actual = {
        (path, method)
        for path, operations in specification["paths"].items()
        for method in operations
    }
    # Both services expose the same GET /health path on different origins.
    assert actual == expected
