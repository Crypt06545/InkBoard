"use client";

import { useCallback, useEffect, useState } from "react";

export type BoardBackground = "dots" | "grid" | "plain";

const storageKey = (boardId: string) => `board-bg:${boardId}`;

const isBackground = (value: unknown): value is BoardBackground =>
  value === "dots" || value === "grid" || value === "plain";

export const useBoardBackground = (boardId: string) => {
  const [background, setBackgroundState] = useState<BoardBackground>("dots");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey(boardId));
      setBackgroundState(isBackground(saved) ? saved : "dots");
    } catch {
      setBackgroundState("dots");
    }
  }, [boardId]);

  const setBackground = useCallback(
    (next: BoardBackground) => {
      setBackgroundState(next);
      try {
        window.localStorage.setItem(storageKey(boardId), next);
      } catch {
        /* storage unavailable, keep in-memory only */
      }
    },
    [boardId],
  );

  return { background, setBackground };
};
