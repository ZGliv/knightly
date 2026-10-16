/*
 * File: hooks/useEngine.ts
 * Description: React hook wrapper around the Stockfish client for position analysis and engine-move generation.
 * Functions:
 * - useEngine: Initializes and exposes engine helpers for analysis requests.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { StockfishClient } from "@/lib/engine/stockfish-client";

export function useEngine() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const clientRef = useRef<StockfishClient | null>(null);

  useEffect(() => {
    // This avoids worker creation during server-side rendering.
    if (typeof window === "undefined") return;

    const engineClient = new StockfishClient();
    clientRef.current = engineClient;
    let mounted = true;

    // This starts the UCI handshake once on mount.
    engineClient
      .init()
      .then(() => {
        if (!mounted) return;
        setReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setFailed(true);
      });

    return () => {
      mounted = false;
      engineClient.terminate();
      clientRef.current = null;
    };
  }, []);

  return {
    ready,
    failed,
    setSkillLevel: async (level: number) => {
      if (!clientRef.current) return;
      await clientRef.current.setSkillLevel(level);
    },
    analyzePosition: async (fen: string, depth = 10) => {
      if (!clientRef.current) {
        throw new Error("Engine not initialized yet.");
      }
      return clientRef.current.analyzePosition(fen, depth);
    },
  };
}
