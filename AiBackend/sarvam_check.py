"""Run explicitly to send one short greeting to Sarvam."""

import sys
from tempfile import NamedTemporaryFile

from app.config import load_environment
from app.speech import SpeechUnavailable, synthesize


def main():
    load_environment()
    try:
        audio = synthesize("\u0928\u092e\u0938\u094d\u0924\u0947\u0964", "hi-IN")
    except SpeechUnavailable as err:
        print(str(err), file=sys.stderr)
        return 1
    with NamedTemporaryFile(
        prefix="sarvam-greeting-", suffix=".wav", delete=False
    ) as output:
        output.write(audio)
    print(f"Playable WAV saved to {output.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
