// lib/socket.ts
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const token = useAuthStore.getState().accessToken;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
  const wsBase = apiUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

  socket = io(`${wsBase}/boards`, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
