import { logger } from '../../lib/logger.js';

export function getRTCConfiguration(): RTCConfiguration {
  const stunServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_PASSWORD;

  const iceServers: RTCIceServer[] = [...stunServers];

  if (turnUrl && turnUsername && turnCredential) {
    const urls = turnUrl.includes(',') ? turnUrl.split(',').map((u: string) => u.trim()) : turnUrl.trim();
    iceServers.push({
      urls,
      username: turnUsername.trim(),
      credential: turnCredential.trim(),
    });
    logger.info('Configured production TURN relay server for WebRTC NAT Traversal', { turnUrl });
  } else {
    logger.info('Using STUN servers for WebRTC P2P (TURN env variables omitted or local dev)');
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
  };
}
