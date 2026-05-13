import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { googleLogout } from "@react-oauth/google";
import type { MeResponse } from "@plae/shared";
import { api } from "./api";

type AuthState =
  | { status: "unauthenticated"; error?: string }
  | { status: "verifying" }
  | { status: "authenticated"; idToken: string; user: MeResponse };

type AuthContextValue = {
  state: AuthState;
  signIn: (idToken: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "unauthenticated" });

  const signIn = useCallback(async (idToken: string) => {
    setState({ status: "verifying" });
    const result = await api.me(idToken);
    if (result.ok) {
      setState({ status: "authenticated", idToken, user: result.data });
    } else {
      setState({
        status: "unauthenticated",
        error: `${result.error.code}: ${result.error.message}`,
      });
    }
  }, []);

  const signOut = useCallback(() => {
    googleLogout();
    setState({ status: "unauthenticated" });
  }, []);

  return (
    <AuthContext.Provider value={{ state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
