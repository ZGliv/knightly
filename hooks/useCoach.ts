/*
 * File: hooks/useCoach.ts
 * Description: Manages coach message feed state and formats recent guidance for display.
 * Functions:
 * - useCoach: Stores and updates lightweight live coaching messages.
 */

"use client";

import { useMemo, useState } from "react";
import type { MoveClassification } from "@/types/game";

export type CoachMessageKind = "player-feedback" | "opponent-plan";

export interface CoachMessage {
  id: string;
  ply: number;
  kind: CoachMessageKind;
  title: string;
  classification?: MoveClassification;
  text: string;
}

export function useCoach() {
  const [messages, setMessages] = useState<CoachMessage[]>([]);

  function pushMessage(message: Omit<CoachMessage, "id">) {
    const next = {
      ...message,
      id: crypto.randomUUID(),
    };

    // This keeps the latest coach insights at the top with a short feed length.
    setMessages((current) => [next, ...current].slice(0, 12));
  }

  const latestMessage = useMemo(() => messages[0] ?? null, [messages]);

  return {
    messages,
    latestMessage,
    pushMessage,
    clear: () => setMessages([]),
  };
}
