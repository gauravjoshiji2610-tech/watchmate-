import { logger } from '../../lib/logger.js';

export function getRTCConfiguration(): RTCConfiguration {
  const stunServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_PASSWORD;

  const iceServers: RTCIceServer[] = [...stunServers];

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
    logger.info('Configured TURN relay server for WebRTC', { turnUrl });
  } else {
    logger.info('Using STUN servers for WebRTC P2P (TURN env variables omitted)');
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all', // STUN first, TURN fallback
  };
}
