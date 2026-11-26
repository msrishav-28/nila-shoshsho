from app.live_data import indian_season
from app.crop_windows import find_window, windows_for_season


def test_kharif_is_monsoon_months():
    assert indian_season(7) == "Kharif"
    assert indian_season(9) == "Kharif"


def test_rabi_includes_january_and_november():
    assert indian_season(1) == "Rabi"
    assert indian_season(11) == "Rabi"
    assert indian_season(2) == "Rabi"


def test_zaid_is_hot_pre_monsoon():
    assert indian_season(4) == "Zaid"
    assert indian_season(5) == "Zaid"


def test_paddy_has_kharif_window():
    window = find_window("paddy")
    assert window["season"] == "Kharif"
    assert "June" in window["sow_months"]


def test_current_season_windows_are_not_empty():
    assert windows_for_season(indian_season())
