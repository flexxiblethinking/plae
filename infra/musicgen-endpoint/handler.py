# Custom inference handler for facebook/musicgen-small on HF Inference Endpoints.
#
# MusicGen is not supported by the transformers high-level pipeline on
# Inference Endpoints, so a custom EndpointHandler is required.
#
# Deployment (see infra/musicgen-endpoint/ — keep this repo copy in sync):
#   1. Duplicate facebook/musicgen-small to your HF profile via
#      https://huggingface.co/spaces/huggingface-projects/repo_duplicator
#   2. Add this handler.py and requirements.txt to the duplicated repo
#   3. Deploy that repo as an Inference Endpoint (GPU, scale-to-zero on)
#
# Unlike the official blog handler (which returns a raw float array, ~5 MB
# of JSON), this returns a base64-encoded WAV so the payload over the wire
# stays small enough for ~20 concurrent students on a school network.

from typing import Any, Dict
import base64
import io

import numpy as np
import scipy.io.wavfile
import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration

# Tuned to the ≤30s generation budget (CLAUDE.md). On an L4, 1500 tokens
# took ~40s; ~1100 tokens (~22s of audio) keeps generation under ~30s with
# margin for the Haiku refine step and 2 MB+ payload handling.
DEFAULT_MAX_NEW_TOKENS = 1100


class EndpointHandler:
    def __init__(self, path: str = ""):
        self.processor = AutoProcessor.from_pretrained(path)
        self.model = MusicgenForConditionalGeneration.from_pretrained(
            path, torch_dtype=torch.float16
        ).to("cuda")
        self.sample_rate = self.model.config.audio_encoder.sampling_rate

    def __call__(self, data: Dict[str, Any]) -> Dict[str, Any]:
        inputs = data.pop("inputs", data)
        parameters = data.pop("parameters", None) or {}
        parameters.setdefault("do_sample", True)
        parameters.setdefault("guidance_scale", 3)
        parameters.setdefault("max_new_tokens", DEFAULT_MAX_NEW_TOKENS)

        processed = self.processor(
            text=[inputs], padding=True, return_tensors="pt"
        ).to("cuda")

        with torch.autocast("cuda"):
            outputs = self.model.generate(**processed, **parameters)

        # outputs: (batch, channels, samples) — flatten to a mono waveform.
        audio = outputs[0].cpu().numpy().reshape(-1).astype(np.float32)
        audio = np.clip(audio, -1.0, 1.0)
        pcm16 = (audio * 32767.0).astype(np.int16)

        buf = io.BytesIO()
        scipy.io.wavfile.write(buf, rate=self.sample_rate, data=pcm16)
        audio_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        return {
            "audio_base64": audio_b64,
            "mime_type": "audio/wav",
            "sample_rate": self.sample_rate,
        }
