import Anthropic from "@anthropic-ai/sdk";
import {
  STRUDEL_OUTPUT_SCHEMA,
  STRUDEL_SYSTEM_PROMPT,
  isStrudelCodeSafe,
} from "../harness/strudel";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;

export type StrudelGeneration = {
  code: string;
  explanation: string;
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

export async function generateStrudel(args: {
  apiKey: string;
  prompt: string;
}): Promise<StrudelGeneration> {
  const client = new Anthropic({ apiKey: args.apiKey });

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
      messages: [{ role: "user", content: args.prompt }],
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

  const { code, explanation } = parsed as StrudelGeneration;

  if (!isStrudelCodeSafe(code)) {
    throw new HarnessError(
      "unsafe_output",
      "generated code matched forbidden pattern",
    );
  }

  return { code, explanation };
}
