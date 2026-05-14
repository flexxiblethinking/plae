import type {
  ApiResponse,
  GenerateMusicgenRequest,
  GenerateMusicgenResponse,
  GenerateStrudelRequest,
  GenerateStrudelResponse,
  MeResponse,
} from "@plae/shared";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

async function call<T>(
  path: string,
  init: RequestInit,
  idToken?: string,
): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  if (idToken) {
    headers.set("authorization", `Bearer ${idToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { code: "network_error", message: msg } };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      error: { code: "parse_failure", message: "response was not JSON" },
    };
  }
  return body as ApiResponse<T>;
}

export const api = {
  me: (idToken: string) => call<MeResponse>("/api/me", { method: "GET" }, idToken),
  generateStrudel: (idToken: string, req: GenerateStrudelRequest) =>
    call<GenerateStrudelResponse>(
      "/api/generate/strudel",
      { method: "POST", body: JSON.stringify(req) },
      idToken,
    ),
  generateMusicgen: (idToken: string, req: GenerateMusicgenRequest) =>
    call<GenerateMusicgenResponse>(
      "/api/generate/musicgen",
      { method: "POST", body: JSON.stringify(req) },
      idToken,
    ),
};
