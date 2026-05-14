import { HarnessError } from "./anthropic";

export type MusicgenAudio = {
  audioBase64: string;
  mimeType: string;
};

type HfHandlerResponse = {
  audio_base64?: unknown;
  mime_type?: unknown;
};

// Calls the HF Inference Endpoint running musicgen-small. The endpoint uses
// the custom handler in infra/musicgen-endpoint/handler.py, which takes
// { inputs: "<english prompt>" } and returns JSON
// { audio_base64, mime_type, sample_rate } — a base64-encoded WAV, already
// in the shape plae's { ok, data } API convention needs (CLAUDE.md §5).
export async function generateMusicgenAudio(args: {
  endpointUrl: string;
  token: string;
  prompt: string;
}): Promise<MusicgenAudio> {
  let response: Response;
  try {
    response = await fetch(args.endpointUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${args.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ inputs: args.prompt }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new HarnessError(
      "upstream_error",
      `MusicGen endpoint unreachable: ${msg}`,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new HarnessError(
      "upstream_error",
      `MusicGen endpoint returned ${response.status}: ${detail.slice(0, 200)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new HarnessError(
      "parse_failure",
      "MusicGen response was not valid JSON",
    );
  }

  // HF Inference Endpoints sometimes wrap the handler return in an array.
  const payload = (Array.isArray(parsed) ? parsed[0] : parsed) as
    | HfHandlerResponse
    | undefined;
  if (!payload || typeof payload.audio_base64 !== "string") {
    throw new HarnessError(
      "parse_failure",
      "MusicGen response missing audio_base64",
    );
  }

  return {
    audioBase64: payload.audio_base64,
    mimeType:
      typeof payload.mime_type === "string" ? payload.mime_type : "audio/wav",
  };
}
