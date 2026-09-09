from app.search_catalog import match_features


def test_blank_query_returns_catalog():
    assert len(match_features("")) >= 8


def test_fertilizer_query_hits_fertilizer_feature():
    ids = [item["id"] for item in match_features("urea")]
    assert "fertilizer" in ids


def test_unknown_query_is_empty():
    assert match_features("zzzz-not-a-feature") == []


def test_logistics_query_hits_logistics_feature():
    ids = [item["id"] for item in match_features("lorry")]
    assert "logistics" in ids
