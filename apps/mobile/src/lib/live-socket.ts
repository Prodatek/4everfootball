import { io, type Socket } from "socket.io-client";
import { API_URL } from "./env";

let socket: Socket | null = null;

export function getLiveSocket(): Socket {
  socket ??= io(`${API_URL}/live`, {
    autoConnect: true,
    transports: ["websocket", "polling"],
  });

  return socket;
}
