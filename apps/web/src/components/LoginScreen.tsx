import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../lib/auth";

export function LoginScreen() {
  const { state, signIn } = useAuth();
  const clientIdConfigured = Boolean(
    import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
  );
  const error = state.status === "unauthenticated" ? state.error : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">
          plae
        </h1>
        <p className="mt-3 text-slate-600">자연어로 음악을 만들어 봐요</p>

        <div className="mt-10">
          {state.status === "verifying" ? (
            <div className="text-slate-500">로그인 확인 중...</div>
          ) : (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(cred) => {
                  if (cred.credential) void signIn(cred.credential);
                }}
                onError={() => {
                  // GoogleLogin can fail for popup-blocked / network reasons.
                  // State stays "unauthenticated" — the user can retry.
                  console.error("Google sign-in failed");
                }}
                useOneTap={false}
                locale="ko"
              />
            </div>
          )}

          {!clientIdConfigured && (
            <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              개발자 안내: <code>VITE_GOOGLE_OAUTH_CLIENT_ID</code>가 비어 있어요.{" "}
              <code>apps/web/.env.local</code>에 추가하세요.
            </p>
          )}

          {error && (
            <p className="mt-4 text-sm text-rose-600 break-words">{error}</p>
          )}

          <p className="mt-8 text-xs text-slate-400">
            학교 구글 계정으로 로그인해 주세요.
          </p>
        </div>
      </div>
    </main>
  );
}
