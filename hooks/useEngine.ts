"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { StockfishClient } from "@/lib/engine/stockfish-client";

export function useEngine() {
  const client = useRef<StockfishClient | null>(null);
  const [generation, setGeneration] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const next = new StockfishClient();
    client.current = next;
    next
      .init()
      .then(() => {
        if (live) setStatus("ready");
      })
      .catch((e: Error) => {
        if (live) {
          setError(e.message);
          setStatus("error");
        }
      });
    return () => {
      live = false;
      next.terminate();
      if (client.current === next) client.current = null;
    };
  }, [generation]);
  const analyze = useCallback(async (fen: string, skill = 20) => {
    if (!client.current) throw new Error("Engine is still loading.");
    try {
      return await client.current.analyzePosition(fen, skill);
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
      throw e;
    }
  }, []);
  const restart = useCallback(() => {
    setStatus("loading");
    setError("");
    setGeneration((v) => v + 1);
  }, []);
  return { status, error, analyze, restart };
}
