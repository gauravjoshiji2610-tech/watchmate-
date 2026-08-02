import { io, type Socket } from 'socket.io-client';

/**
 * Socket.IO service module.
 *
 * Reads server base URL dynamically from `import.meta.env.VITE_SOCKET_URL`.
 * Manages namespace connection instances for /signaling, /presence, /chat.
 */

const SOCKET_BASE_URL = import.meta.env.VITE_SOCKET_URL || '';

let signalingSocket: Socket | null = null;
let presenceSocket: Socket | null = null;
let chatSocket: Socket | null = null;

function getNamespaceUrl(namespace: string): string {
  return SOCKET_BASE_URL ? `${SOCKET_BASE_URL}${namespace}` : namespace;
}

export function getPresenceSocket(userToken: string): Socket {
  if (!presenceSocket) {
    presenceSocket = io(getNamespaceUrl('/presence'), {
      auth: { userToken },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return presenceSocket;
}

export function getSignalingSocket(userToken: string): Socket {
  if (!signalingSocket) {
    signalingSocket = io(getNamespaceUrl('/signaling'), {
      auth: { userToken },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return signalingSocket;
}

export function getChatSocket(userToken: string): Socket {
  if (!chatSocket) {
    chatSocket = io(getNamespaceUrl('/chat'), {
      auth: { userToken },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return chatSocket;
}

export function disconnectAllSockets() {
  signalingSocket?.disconnect();
  presenceSocket?.disconnect();
  chatSocket?.disconnect();
  signalingSocket = null;
  presenceSocket = null;
  chatSocket = null;
}
