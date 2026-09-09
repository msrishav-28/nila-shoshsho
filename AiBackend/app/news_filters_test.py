from app.news_filters import is_allowed_state, news_hl, normalize_state


def test_kerala_and_odisha_are_allowed():
    assert is_allowed_state(normalize_state("Kerala"))
    assert is_allowed_state(normalize_state("Odisha"))
    assert is_allowed_state(normalize_state("all"))


def test_safe_unknown_state_is_allowed_and_garbage_is_not():
    assert is_allowed_state("new farm state")
    assert not is_allowed_state("kerala<script>")


def test_hindi_label_maps_to_hi():
    assert news_hl("हिन्दी") == "hi"
    assert news_hl("en") == "en"
    assert news_hl("English") == "en"
