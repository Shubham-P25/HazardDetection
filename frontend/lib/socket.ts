'use client';

import { io, Socket } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_SOCKET_URL
  || process.env.NEXT_PUBLIC_BACKEND_URL
  || 'http://localhost:4000';

let socket: Socket | null = null;
let _getToken: (() => Promise<string | null>) | null = null;

// B5: register fresh token getter from Providers
export function setSocketTokenGetter(fn: (() => Promise<string | null>) | null) {
  _getToken = fn;
  // Update existing socket auth too
  if (socket && fn) {
    socket.auth = (cb: (data: object) => void) => fn().then((token) => cb(token ? { token } : {}));
  }
}

export function getSocket() {
  if (!socket) {
    console.log('[socket] connecting', URL);
    socket = io(URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      transports: ['websocket'],
      // B5: function form - always sends fresh token on each (re)connect
      auth: (cb: (data: object) => void) => {
        if (_getToken) {
          _getToken().then((token) => cb(token ? { token } : {})).catch(() => cb({}));
        } else {
          cb({});
        }
      },
    });

    // B5: on connect_error with Unauthorized, refresh token and retry (max 3)
    let unauthorizedRetries = 0;
    socket.on('connect_error', (err: Error) => {
      if (err.message === 'Unauthorized' && unauthorizedRetries < 3) {
        unauthorizedRetries += 1;
        // Short delay, then reconnect with a fresh token
        setTimeout(() => socket?.connect(), 1000 * unauthorizedRetries);
      } else {
        unauthorizedRetries = 0;
      }
    });
    socket.on('connect', () => { unauthorizedRetries = 0; });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
}
