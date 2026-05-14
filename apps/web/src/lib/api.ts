import type {
  ApiResponse,
  GenerateMusicgenRequest,
  GenerateMusicgenResponse,
  GenerateStrudelRequest,
  GenerateStrudelResponse,
  MeResponse,
  TeacherStatsResponse,
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
  teacherStats: (idToken: string) =>
    call<TeacherStatsResponse>(
      "/api/teacher/stats",
      { method: "GET" },
      idToken,
    ),
};

// Maps API + client error codes to friendly Korean copy for 7th-graders.
export function errorMessage(code: string): string {
  switch (code) {
    case "quota_exceeded":
      return "오늘 만들 수 있는 횟수를 다 썼어요. 내일 다시 만들 수 있어요.";
    case "unsafe_output":
      return "안전하지 않은 결과가 만들어져서 멈췄어요. 다른 표현으로 다시 해볼까요?";
    case "blocked_input":
      return "입력에 사용할 수 없는 표현이 있어요. 다른 말로 바꿔서 다시 해볼까요?";
    case "invalid_input":
      return "입력을 확인해 주세요. (1~500자 사이로 적어요)";
    case "network_error":
    case "parse_failure":
      return "서버와 연결이 잘 안 됐어요. 잠시 후 다시 시도해 주세요.";
    default:
      return "음악을 만드는 중에 문제가 생겼어요. 다시 시도해 주세요.";
  }
}
