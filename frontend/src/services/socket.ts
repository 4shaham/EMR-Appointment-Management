import { io, Socket } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:5000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log(`[Socket.IO] Connected with id: ${socket?.id}`);
    });

    socket.on("disconnect", () => {
      console.log("[Socket.IO] Disconnected");
    });
  }
  return socket;
}

export function joinSchedulerRoom(doctorId: string, date: string): void {
  const s = getSocket();
  const room = `${doctorId}:${date}`;
  s.emit("join:scheduler", room);
}
