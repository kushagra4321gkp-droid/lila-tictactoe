import { useState, useEffect } from "react";
import { Session } from "@heroiclabs/nakama-js";
import { restoreSession, clearSession, rpcCreateMatch } from "./nakamaClient";
import { Screen, GameMode } from "./types";
import Login       from "./components/Login";
import Lobby       from "./components/Lobby";
import Game        from "./components/Game";
import Leaderboard from "./components/Leaderboard";

export default function App() {
  const [screen,   setScreen]   = useState<Screen>("login");
  const [session,  setSession]  = useState<Session | null>(null);
  const [username, setUsername] = useState("");
  const [matchId,  setMatchId]  = useState<string | null>(null);

  useEffect(() => {
    const saved = restoreSession();
    if (saved && !saved.isexpired(Date.now() / 1000)) {
      setSession(saved);
      setUsername(saved.username ?? "Player");
      setScreen("lobby");
    }
  }, []);

  const handleLogin = (sess: Session) => {
    setSession(sess);
    setUsername(sess.username ?? "Player");
    setScreen("lobby");
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setScreen("login");
  };

  const handleFindMatch = async (mode: GameMode) => {
    if (!session) return;
    try {
      const id = await rpcCreateMatch(session, mode);
      setMatchId(id);
      setScreen("game");
    } catch (e: any) {
      alert("Failed to create match: " + (e?.message ?? "unknown"));
    }
  };

  const handleJoinMatch = (id: string) => {
    setMatchId(id);
    setScreen("game");
  };

  const handleGameBack = () => {
    setMatchId(null);
    setScreen("lobby");
  };

  if (screen === "login" || !session) return <Login onLogin={handleLogin} />;

  if (screen === "lobby") return (
    <Lobby session={session} username={username}
      onFindMatch={handleFindMatch} onJoinMatch={handleJoinMatch}
      onLeaderboard={() => setScreen("leaderboard")} onLogout={handleLogout} />
  );

  if (screen === "game" && matchId) return (
    <Game session={session} matchId={matchId} username={username}
      onBack={handleGameBack} onLeaderboard={() => setScreen("leaderboard")} />
  );

  if (screen === "leaderboard") return (
    <Leaderboard session={session} myUserId={session.user_id ?? ""}
      onBack={() => setScreen("lobby")} />
  );

  return null;
}
