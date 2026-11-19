import os
from pathlib import Path

from app import config


def test_environment_path_is_the_single_repository_file():
    assert config.ENVIRONMENT_FILE == Path(__file__).resolve().parents[2] / ".env.local"


def test_environment_preserves_literal_secrets_and_process_precedence(
    monkeypatch, tmp_path
):
    environment = tmp_path / ".env.local"
    environment.write_text(
        "CONFIG_FIXTURE_SECRET=${UNEXPANDED_VALUE}\nCONFIG_FIXTURE_PORT=5001\n"
    )
    monkeypatch.setattr(config, "ENVIRONMENT_FILE", environment)
    monkeypatch.setenv("CONFIG_FIXTURE_SECRET", "")
    monkeypatch.delenv("CONFIG_FIXTURE_SECRET")
    monkeypatch.setenv("CONFIG_FIXTURE_PORT", "6001")
    monkeypatch.chdir(tmp_path)
    config.load_environment()
    assert os.environ["CONFIG_FIXTURE_SECRET"] == "${UNEXPANDED_VALUE}"
    assert os.environ["CONFIG_FIXTURE_PORT"] == "6001"
