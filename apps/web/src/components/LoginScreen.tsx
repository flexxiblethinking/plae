import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../lib/auth";

export function LoginScreen() {
  const { state, signIn } = useAuth();
  const clientIdConfigured = Boolean(
    import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
  );
  const error = state.status === "unauthenticated" ? state.error : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="panel animate-rise w-full max-w-md p-8 text-center sm:p-10">
        <p className="panel-label">AI Music Studio</p>
        <h1 className="mt-5 font-mono text-6xl font-bold lowercase tracking-tight text-cream">
          pl<span className="text-accent">a</span>e
        </h1>
        <p className="mt-3 font-mono text-sm text-cream/55">
          Prompt Layered Audio Engine
        </p>
        <p className="mt-2 inline-block rounded-full border border-signal/30 bg-signal/10 px-3 py-0.5 font-mono text-[11px] uppercase tracking-widest text-signal/70">
          늘푸른중학교 전용
        </p>

        <div className="mt-10">
          {state.status === "verifying" ? (
            <div className="font-mono text-sm uppercase tracking-wider text-signal">
              로그인 확인 중...
            </div>
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
            <p className="mt-4 rounded-lg border border-marigold/30 bg-marigold/10 px-3 py-2 text-xs text-marigold">
              개발자 안내: <code>VITE_GOOGLE_OAUTH_CLIENT_ID</code>가 비어 있어요.{" "}
              <code>apps/web/.env.local</code>에 추가하세요.
            </p>
          )}

          {error && (
            <p className="mt-4 break-words text-sm text-accent">{error}</p>
          )}

          <p className="mt-8 font-mono text-[11px] uppercase tracking-wider text-cream/35">
            학교 구글 계정으로 로그인해 주세요.
          </p>
        </div>
      </div>
    </main>
  );
}
