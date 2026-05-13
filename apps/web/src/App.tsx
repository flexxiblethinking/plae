import { HomeScreen } from "./components/HomeScreen";
import { LoginScreen } from "./components/LoginScreen";
import { useAuth } from "./lib/auth";

export function App() {
  const { state } = useAuth();
  return state.status === "authenticated" ? <HomeScreen /> : <LoginScreen />;
}
