import base64
import io
import os
import wave

import httpx
from sarvamai import SarvamAI
from app.deadline import provider_timeout


class SpeechUnavailable(Exception):
    def __init__(self, message, status):
        super().__init__(message)
        self.status = status


def synthesize(text, language):
    key = os.environ.get("SARVAM_API_KEY", "").strip()
    if not key:
        raise SpeechUnavailable("Voice speak is not configured", 503)
    try:
        timeout = provider_timeout(30)
        with httpx.Client(timeout=timeout, follow_redirects=False) as transport:
            client = SarvamAI(
                api_subscription_key=key, httpx_client=transport, timeout=timeout
            )
            reply = client.text_to_speech.convert(
                text=text,
                language_code=language,
                model="bulbul:v3",
                speaker="shubh",
                output_audio_codec="wav",
                request_options={"max_retries": 0},
            )
        audio = base64.b64decode(reply.audios[0], validate=True)
        with wave.open(io.BytesIO(audio), "rb") as wav:
            frames = wav.getnframes()
            size = frames * wav.getnchannels() * wav.getsampwidth()
            if frames == 0 or size > len(audio) or len(wav.readframes(frames)) != size:
                raise ValueError("Incomplete waveform")
        return audio
    except Exception as err:
        status = getattr(err, "status_code", None)
        if status in (401, 402, 403, 429):
            raise SpeechUnavailable("Voice provider refused the request", 503) from None
        raise SpeechUnavailable(
            "Voice provider did not return playable audio", 502
        ) from None
