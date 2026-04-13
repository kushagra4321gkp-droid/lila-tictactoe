import { useState, useEffect, useRef } from "react";
import { Session, Socket } from "@heroiclabs/nakama-js";
import { restoreSession, clearSession, createSocket } from "./nakamaClient";
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
  const [finding,  setFinding]  = useState(false);
  const socketRef  = useRef<Socket | null>(null);
  const ticketRef  = useRef<string | null>(null);

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
    setFinding(true);
    try {
      const socket = createSocket();
      socketRef.current = socket;
      await socket.connect(session, false);

      socket.onmatchmakermatched = (matched) => {
        ticketRef.current = null;
        const mid = matched.match_id ?? (matched as any).matchId;
        if (mid) {
          socket.disconnect(false);
          socketRef.current = null;
          setMatchId(mid);
          setFinding(false);
          setScreen("game");
        }
      };

      const result = await socket.addMatchmaker("*", 2, 2, { mode });
      ticketRef.current = result.ticket;
    } catch (e: any) {
      setFinding(false);
      alert("Failed to find match: " + (e?.message ?? "unknown"));
      socketRef.current?.disconnect(false);
      socketRef.current = null;
    }
  };

  const handleCancelFind = () => {
    if (socketRef.current && ticketRef.current) {
      socketRef.current.removeMatchmaker(ticketRef.current).catch(() => {});
      socketRef.current.disconnect(false);
      socketRef.current = null;
    }
    ticketRef.current = null;
    setFinding(false);
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
    <>
      {finding && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", zIndex: 999
        }}>
          <div className="spinner" style={{ marginBottom: "1rem" }} />
          <p style={{ color: "var(--text)", fontWeight: 600, marginBottom: "0.5rem" }}>Finding a match...</p>
          <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1.25rem" }}>Waiting for an opponent</p>
          <button className="btn btn-outline" style={{ width: "auto", padding: "0.5rem 1.5rem" }} onClick={handleCancelFind}>
            Cancel
          </button>
        </div>
      )}
      <Lobby session={session} username={username}
        onFindMatch={handleFindMatch} onJoinMatch={handleJoinMatch}
        onLeaderboard={() => setScreen("leaderboard")} onLogout={handleLogout} />
    </>
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
