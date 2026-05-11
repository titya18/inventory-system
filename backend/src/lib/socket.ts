import { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | null = null;

export const setIO = (io: SocketIOServer) => {
  _io = io;
};

export const getIO = (): SocketIOServer | null => _io;
