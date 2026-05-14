import Anthropic from "@anthropic-ai/sdk";
import type { LayerType, StrudelLayer } from "@plae/shared";
import {
  STRUDEL_OUTPUT_SCHEMA,
  STRUDEL_SYSTEM_PROMPT,
  isStrudelCodeSafe,
} from "../harness/strudel";
import {
  MUSICGEN_OUTPUT_SCHEMA,
  MUSICGEN_SYSTEM_PROMPT,
} from "../harness/musicgen";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;
const DEFAULT_BPM = 90;
const BPM_MIN = 60;
const BPM_MAX = 140;

export type StrudelGeneration = {
  code: string;
  explanation: string;
  bpm: number;
};

export class HarnessError extends Error {
  constructor(
    public readonly code: "upstream_error" | "parse_failure" | "unsafe_output",
    message: string,
  ) {
    super(message);
    this.name = "HarnessError";
  }
}

// Builds the structured user turn. The student's free text goes only in the
// `description` field here — never in the system prompt (CLAUDE.md §5).
function buildLayerUserContent(args: {
  layerType: LayerType;
  description: string;
  bpm?: number;
  existingLayers: StrudelLayer[];
}): string {
  const existing =
    args.existingLayers.length > 0
      ? args.existingLayers.map((l) => `- ${l.type}: ${l.code}`).join("\n")
      : "(없음 — 이것이 첫 레이어입니다)";
  return [
    `레이어 타입: ${args.layerType}`,
    `현재 BPM: ${args.bpm ?? "(미정 — 첫 레이어에서 정해주세요)"}`,
    `기존 레이어:`,
    existing,
    `학생 설명: ${args.description}`,
  ].join("\n");
}

export async function generateStrudel(args: {
  apiKey: string;
  layerType: LayerType;
  description: string;
  bpm?: number;
  existingLayers: StrudelLayer[];
}): Promise<StrudelGeneration> {
  const client = new Anthropic({ apiKey: args.apiKey });
  const isFirstLayer = args.existingLayers.length === 0;

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // System block is the stable prefix — cache it. Once the prompt
      // grows past Haiku 4.5's ~4096-token minimum, repeated student
      // requests will read from cache at ~0.1x cost.
      system: [
        {
          type: "text",
          text: STRUDEL_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        { role: "user", content: buildLayerUserContent(args) },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: STRUDEL_OUTPUT_SCHEMA,
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new HarnessError("upstream_error", msg);
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new HarnessError("parse_failure", "no text block in response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new HarnessError("parse_failure", "response was not valid JSON");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { code?: unknown }).code !== "string" ||
    typeof (parsed as { explanation?: unknown }).explanation !== "string"
  ) {
    throw new HarnessError("parse_failure", "response missing required fields");
  }

  const { code, explanation, bpm: rawBpm } = parsed as {
    code: string;
    explanation: string;
    bpm?: unknown;
  };

  if (!isStrudelCodeSafe(code)) {
    throw new HarnessError(
      "unsafe_output",
      "generated code matched forbidden pattern",
    );
  }

  // The first layer establishes tempo (harness picks it); later layers
  // inherit the bpm passed in the request.
  let bpm: number;
  if (isFirstLayer) {
    bpm =
      typeof rawBpm === "number" && rawBpm >= BPM_MIN && rawBpm <= BPM_MAX
        ? Math.round(rawBpm)
        : DEFAULT_BPM;
  } else {
    bpm = args.bpm ?? DEFAULT_BPM;
  }

  return { code, explanation, bpm };
}

export type MusicgenRefinement = {
  prompt: string;       // English prompt for MusicGen
  explanation: string;  // Korean explanation for the student
};

// Refines a student's Korean mood description into an English MusicGen
// prompt. Does not generate audio — that runs on the HF endpoint.
export async function refineMusicgenPrompt(args: {
  apiKey: string;
  prompt: string;
}): Promise<MusicgenRefinement> {
  const client = new Anthropic({ apiKey: args.apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: MUSICGEN_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: args.prompt }],
      output_config: {
        format: {
          type: "json_schema",
          schema: MUSICGEN_OUTPUT_SCHEMA,
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new HarnessError("upstream_error", msg);
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new HarnessError("parse_failure", "no text block in response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new HarnessError("parse_failure", "response was not valid JSON");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { prompt?: unknown }).prompt !== "string" ||
    typeof (parsed as { explanation?: unknown }).explanation !== "string"
  ) {
    throw new HarnessError("parse_failure", "response missing required fields");
  }

  return parsed as MusicgenRefinement;
}
