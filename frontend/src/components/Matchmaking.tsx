import { useState, useEffect, useRef } from "react";
import { Session, Socket } from "@heroiclabs/nakama-js";
import { rpcCreateMatch, rpcListMatches } from "../nakamaClient";
import { GameMode } from "../types";

interface Props {
  session:   Session;
  mode:      GameMode;
  onMatched: (matchId: string, socket: Socket | null) => void;
  onCancel:  () => void;
}

export default function Matchmaking({ session, mode, onMatched, onCancel }: Props) {
  const [status,  setStatus]  = useState("Creating room...");
  const [elapsed, setElapsed] = useState(0);
  const [error,   setError]   = useState<string | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const start = async () => {
      try {
        const matchId = await rpcCreateMatch(session, mode);
        matchIdRef.current = matchId;
        if (!mountedRef.current) return;
        setStatus("Waiting for opponent...");
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        pollRef.current = setInterval(async () => {
          try {
            const matches = await rpcListMatches(session);
            const found = matches.find((m: any) => {
              const id = m.match_id ?? m.matchId ?? "";
              return id === matchId;
            });
            if (found && (found.size ?? 0) >= 2 && mountedRef.current) {
              clearInterval(pollRef.current!);
              clearInterval(timerRef.current!);
              onMatched(matchId, null);
            }
          } catch { }
        }, 2000);
      } catch (e: any) {
        if (mountedRef.current) setError(e?.message ?? "Failed to create room.");
      }
    };
    start();
    return () => {
      mountedRef.current = false;
      if (pollRef.current)  clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    if (pollRef.current)  clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    onCancel();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "60dvh" }}>
      <div className="card" style={{ textAlign: "center" }}>
        {error ? (
          <>
            <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{error}</p>
            <button className="btn btn-outline" onClick={onCancel}>Back to Lobby</button>
          </>
        ) : (
          <>
            <div className="spinner" />
            <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{status}</p>
            <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              {elapsed > 0 ? `${elapsed}s elapsed...` : "Your room is visible in Open Rooms."}
            </p>
            <span className={`mode-badge ${mode}`} style={{ display: "inline-block", marginBottom: "1rem" }}>
              {mode === "timed" ? "Timed Mode" : "Classic Mode"}
            </span>
            <button className="btn btn-outline" onClick={handleCancel}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}
