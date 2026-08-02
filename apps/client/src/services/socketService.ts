import { io, type Socket } from 'socket.io-client';

/**
 * Socket.IO service placeholder.
 * Manages connection instances for /signaling, /presence, /chat namespaces.
 */

let signalingSocket: Socket | null = null;
let presenceSocket: Socket | null = null;
let chatSocket: Socket | null = null;

export function getPresenceSocket(userToken: string): Socket {
  if (!presenceSocket) {
    presenceSocket = io('/presence', {
      auth: { userToken },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return presenceSocket;
}

export function getSignalingSocket(userToken: string): Socket {
  if (!signalingSocket) {
    signalingSocket = io('/signaling', {
      auth: { userToken },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return signalingSocket;
}

export function getChatSocket(userToken: string): Socket {
  if (!chatSocket) {
    chatSocket = io('/chat', {
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
