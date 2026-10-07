// hooks/useBoardSocket.ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import type { BoardElement } from "@/lib/api/board.api";

type PresenceUser = { userId: string; name: string };
type CursorPosition = { userId: string; name: string; x: number; y: number };

type UseBoardSocketArgs = {
  boardId: string;
  onElementCreated: (element: BoardElement) => void;
  onElementUpdated: (element: BoardElement) => void;
  onElementDeleted: (elementId: string) => void;
  onElementLive: (element: BoardElement) => void;
};

export function useBoardSocket({
  boardId,
  onElementCreated,
  onElementUpdated,
  onElementDeleted,
  onElementLive,
}: UseBoardSocketArgs) {
  const socketIdRef = useRef<string | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});

  const handlersRef = useRef({
    onElementCreated,
    onElementUpdated,
    onElementDeleted,
    onElementLive,
  });

  useEffect(() => {
    handlersRef.current = {
      onElementCreated,
      onElementUpdated,
      onElementDeleted,
      onElementLive,
    };
  });

  useEffect(() => {
    if (!boardId) return;

    const socket = getSocket();

    /* --- Named handlers (এগুলো cleanup এ remove করতে হবে) --- */
    const onConnect = () => {
      socketIdRef.current = socket.id ?? null;
      socket.emit("wb:join", boardId);
    };

    const onDisconnect = () => {
      socketIdRef.current = null;
    };

    const onPresenceSync = (data: { users: PresenceUser[] }) => {
      setPresence(data.users);
    };

    const onPresenceJoin = (data: { user: PresenceUser }) => {
      setPresence((current) => {
        if (current.some((u) => u.userId === data.user.userId)) return current;
        return [...current, data.user];
      });
    };

    const onPresenceLeave = (data: { user: PresenceUser }) => {
      setPresence((current) =>
        current.filter((u) => u.userId !== data.user.userId),
      );
      setCursors((current) => {
        const next = { ...current };
        delete next[data.user.userId];
        return next;
      });
    };

    const onPresenceCursor = (data: {
      user: PresenceUser;
      x: number;
      y: number;
    }) => {
      setCursors((current) => ({
        ...current,
        [data.user.userId]: { ...data.user, x: data.x, y: data.y },
      }));
    };

    const onElementCreatedEvt = (element: BoardElement) => {
      handlersRef.current.onElementCreated(element);
    };

    const onElementUpdatedEvt = (element: BoardElement) => {
      handlersRef.current.onElementUpdated(element);
    };

    const onElementDeletedEvt = (data: { id: string }) => {
      handlersRef.current.onElementDeleted(data.id);
    };

    const onElementLiveEvt = (data: { element: BoardElement; by: string }) => {
      handlersRef.current.onElementLive(data.element);
    };

    const onError = (err: { message: string }) => {
      console.error("Board socket error:", err.message);
    };

    /* --- Attach listeners --- */
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("presence:sync", onPresenceSync);
    socket.on("presence:join", onPresenceJoin);
    socket.on("presence:leave", onPresenceLeave);
    socket.on("presence:cursor", onPresenceCursor);
    socket.on("element:created", onElementCreatedEvt);
    socket.on("element:updated", onElementUpdatedEvt);
    socket.on("element:deleted", onElementDeletedEvt);
    socket.on("element:live", onElementLiveEvt);
    socket.on("error", onError);

    /* --- Connect (or reuse existing connection) --- */
    if (socket.connected) {
      // ⚠️ Already connected — connect event আর fire হবে না
      socketIdRef.current = socket.id ?? null;
      socket.emit("wb:join", boardId);
    } else {
      socket.connect();
    }

    /* --- Cleanup: শুধু listeners remove, socket.disconnect() কড়ো না --- */
    return () => {
      socket.emit("wb:leave", boardId);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("presence:sync", onPresenceSync);
      socket.off("presence:join", onPresenceJoin);
      socket.off("presence:leave", onPresenceLeave);
      socket.off("presence:cursor", onPresenceCursor);
      socket.off("element:created", onElementCreatedEvt);
      socket.off("element:updated", onElementUpdatedEvt);
      socket.off("element:deleted", onElementDeletedEvt);
      socket.off("element:live", onElementLiveEvt);
      socket.off("error", onError);

      // ❌ DON'T disconnect — singleton socket reuse হবে
      // socket.disconnect();
    };
  }, [boardId]);

  const getSocketId = useCallback(() => socketIdRef.current, []);

  const emitCursor = useCallback(
    (x: number, y: number) => {
      const socket = getSocket();
      if (!socket.connected) return;
      socket.emit("presence:cursor", { boardId, x, y });
    },
    [boardId],
  );

  const emitElementLive = useCallback(
    (element: BoardElement) => {
      const socket = getSocket();
      if (!socket.connected) return;
      socket.emit("element:live", { boardId, element });
    },
    [boardId],
  );

  return { presence, cursors, getSocketId, emitCursor, emitElementLive };
}
