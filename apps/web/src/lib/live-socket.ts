import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getLiveSocket(): Socket {
  socket ??= io(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/live`, {
    autoConnect: true,
    transports: ["websocket", "polling"],
  });

  return socket;
}
