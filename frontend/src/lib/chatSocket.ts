import { io, type Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { AUTH_TOKEN_KEY } from './constants';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/** Socket.IO client with JWT in `auth.token` (required by the chat gateway). */
export function createChatSocket(): Socket {
  const token = Cookies.get(AUTH_TOKEN_KEY);
  return io(SOCKET_URL, {
    auth: { token: token ?? '' },
  });
}

export { SOCKET_URL };
