"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EngineStrength } from "@/lib/engine/strength";
import type { HumanStatus } from "@/lib/engine/maia-client";
import { StockfishClient } from "@/lib/engine/stockfish-client";

export function useEngine() {
  const client = useRef<StockfishClient | null>(null);
  const [generation, setGeneration] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [humanStatus, setHumanStatus] = useState<HumanStatus>("idle");
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const next = new StockfishClient((status) => { if (live) setHumanStatus(status); });
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
  const analyze = useCallback(async (fen: string, skill: EngineStrength = 20, history?: string[]) => {
    const activeClient = client.current;
    if (!activeClient) throw new Error("Engine is still loading.");
    try {
      return await activeClient.analyzePosition(fen, skill, history);
    } catch (e) {
      if (client.current === activeClient) {
        setStatus("error");
        setError((e as Error).message);
      }
      throw e;
    }
  }, []);
  const restart = useCallback(() => {
    setStatus("loading");
    setError("");
    setHumanStatus("idle");
    setGeneration((v) => v + 1);
  }, []);
  return { status, humanStatus, error, analyze, restart };
}
