'use client';

import { io, Socket } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_SOCKET_URL
  || process.env.NEXT_PUBLIC_BACKEND_URL
  || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(token?: string | null) {
  if (!socket) {
    console.log('[socket] connecting', URL);
    socket = io(URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      transports: ['websocket'],
      withCredentials: true,
      auth: token ? { token } : {},
    });
  } else if (token) {
    socket.auth = { token };
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
}
