import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { PresenceEvents, type EventEnvelope, type Role, type Room } from '@antigravity/shared-types';
import type { SdpPayload, IceCandidatePayload } from '@antigravity/shared-schemas';
import { generateRoomId } from '@antigravity/shared-utils';
import { PeerConnectionManager } from '../services/webrtc/PeerConnectionManager.js';
import { SignalingService } from '../services/webrtc/SignalingService.js';
import { getPresenceSocket } from '../services/socketService.js';
import type { WebRTCConnectionState } from '../services/webrtc/ConnectionState.js';
import type { WebRTCStatsReport } from '../services/webrtc/WebRTCStatsMonitor.js';
import { getOrCreateUserToken } from '../services/roomService.js';
import { logger } from '../lib/logger.js';

export function useWebRTC(roomId?: string, isHost = false) {
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>('new');
  const [peerUserToken, setPeerUserTokenState] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [stats, setStats] = useState<WebRTCStatsReport | null>(null);

  const pcManagerRef = useRef<PeerConnectionManager | null>(null);
  const signalingRef = useRef<SignalingService | null>(null);
  const peerUserTokenRef = useRef<string | null>(null);
  const hasLocalTracksRef = useRef<boolean>(false);

  const userToken = getOrCreateUserToken();

  const setPeerUserToken = useCallback((token: string | null) => {
    setPeerUserTokenState(token);
    peerUserTokenRef.current = token;
  }, []);

  const disconnectWebRTC = useCallback(() => {
    pcManagerRef.current?.close();
    signalingRef.current?.disconnect();
    pcManagerRef.current = null;
    signalingRef.current = null;
    peerUserTokenRef.current = null;
    hasLocalTracksRef.current = false;
    setConnectionState('closed');
    setPeerUserTokenState(null);
    setRemoteStream(null);
    setStats(null);
    logger.info('[WebRTC Diagnostic] WebRTC connection closed and cleaned up');
  }, []);

  const addLocalStream = useCallback((stream: MediaStream) => {
    if (pcManagerRef.current) {
      pcManagerRef.current.addStream(stream);
      hasLocalTracksRef.current = true;
    }
  }, []);

  const removeLocalStream = useCallback(() => {
    if (pcManagerRef.current) {
      pcManagerRef.current.removeStream();
      hasLocalTracksRef.current = false;
    }
  }, []);

  const replaceLocalTrack = useCallback((kind: 'video' | 'audio', track: MediaStreamTrack | null) => {
    if (pcManagerRef.current) {
      pcManagerRef.current.replaceTrack(kind, track);
      if (track) {
        hasLocalTracksRef.current = true;
      }
    }
  }, []);

  const setRoleTrack = useCallback(
    (role: 'video' | 'micAudio' | 'systemAudio', track: MediaStreamTrack | null, stream?: MediaStream) => {
      if (pcManagerRef.current) {
        pcManagerRef.current.setRoleTrack(role, track, stream);
        if (track) {
          hasLocalTracksRef.current = true;
        }
      }
    },
    [],
  );

  const triggerIceRestart = useCallback(async () => {
    const targetToken = peerUserTokenRef.current;
    if (!pcManagerRef.current || !signalingRef.current || !targetToken) {
      logger.warn('[WebRTC Diagnostic] Cannot restart ICE: PeerConnection or target token missing');
      return;
    }

    try {
      toast.warning('Network disconnect detected. Attempting WebRTC ICE restart...');
      logger.info('[WebRTC Diagnostic] Initiating ICE restart for target peer', { targetToken });
      const offer = await pcManagerRef.current.restartIce();
      signalingRef.current.sendOffer(targetToken, offer);
    } catch (err) {
      logger.error('[WebRTC Diagnostic] ICE restart failed', { err });
      toast.error('WebRTC ICE restart failed');
    }
  }, []);

  const startNegotiation = useCallback(
    async (targetUserToken: string) => {
      if (!pcManagerRef.current || !signalingRef.current) {
        logger.error('[WebRTC Diagnostic] Cannot start negotiation: WebRTC or signaling uninitialized');
        toast.error('WebRTC not initialized');
        return;
      }

      try {
        setPeerUserToken(targetUserToken);
        logger.info('[WebRTC Diagnostic] Host starting SDP offer negotiation', { targetUserToken });
        const offer = await pcManagerRef.current.createOffer();
        signalingRef.current.sendOffer(targetUserToken, offer);
        toast.info('Sending WebRTC stream offer to peer...');
      } catch (err) {
        logger.error('[WebRTC Diagnostic] Failed to create SDP offer', { err });
        toast.error('Failed to create WebRTC offer');
      }
    },
    [setPeerUserToken],
  );

  const connectSignaling = useCallback(
    (targetRoomId: string) => {
      disconnectWebRTC();

      const pcManager = new PeerConnectionManager();
      const signaling = new SignalingService(userToken);
      const presenceSocket = getPresenceSocket(userToken);

      pcManagerRef.current = pcManager;
      signalingRef.current = signaling;

      // Initialize WebRTC Peer Connection
      pcManager.initialize({
        onStateChange: (state) => {
          setConnectionState(state);
          logger.info('[WebRTC Diagnostic] Connection State Changed', { state });
          if (state === 'connected') {
            toast.success('WebRTC Stream Connected!');
          } else if (state === 'failed') {
            toast.error('WebRTC Peer Connection Failed');
          }
        },
        onIceCandidate: (candidate) => {
          const targetToken = peerUserTokenRef.current;
          if (targetToken) {
            signaling.sendIceCandidate(targetToken, candidate.toJSON());
          } else {
            logger.warn('[WebRTC Diagnostic] Local ICE candidate gathered before peer token set');
          }
        },
        onTrack: (stream) => {
          logger.info('[WebRTC Diagnostic] Setting remote stream from peer', {
            trackCount: stream.getTracks().length,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
          });
          setRemoteStream(stream);
          toast.info('Received remote video stream');
        },
        onStats: (statsReport) => {
          setStats(statsReport);
        },
        onIceRestartRequired: () => {
          triggerIceRestart();
        },
      });

      // Connect Signaling socket
      signaling.connect(targetRoomId, {
        onOffer: async (envelope: EventEnvelope<SdpPayload>) => {
          try {
            const producerToken = envelope.payload.producerId;
            logger.info('[Signaling Diagnostic] Received SDP Offer', { producerToken });
            setPeerUserToken(producerToken);
            const rawSdp = envelope.payload.sdp;
            const rtcOffer: RTCSessionDescriptionInit = rawSdp.sdp
              ? { type: rawSdp.type, sdp: rawSdp.sdp }
              : { type: rawSdp.type };

            const answer = await pcManager.handleOffer(rtcOffer);
            signaling.sendAnswer(producerToken, answer);
          } catch (err) {
            logger.error('[Signaling Diagnostic] Failed to handle SDP offer', { err });
            toast.error('Failed to handle incoming WebRTC offer');
          }
        },
        onAnswer: async (envelope: EventEnvelope<SdpPayload>) => {
          try {
            logger.info('[Signaling Diagnostic] Received SDP Answer', { producerToken: envelope.payload.producerId });
            const rawSdp = envelope.payload.sdp;
            const rtcAnswer: RTCSessionDescriptionInit = rawSdp.sdp
              ? { type: rawSdp.type, sdp: rawSdp.sdp }
              : { type: rawSdp.type };

            await pcManager.handleAnswer(rtcAnswer);
          } catch (err) {
            logger.error('[Signaling Diagnostic] Failed to process SDP answer', { err });
            toast.error('Failed to process incoming WebRTC answer');
          }
        },
        onIceCandidate: async (envelope: EventEnvelope<IceCandidatePayload>) => {
          const rawCand = envelope.payload.candidate;
          logger.debug('[Signaling Diagnostic] Received remote ICE Candidate', {
            sdpMid: rawCand.sdpMid,
          });
          const candidateInit: RTCIceCandidateInit = {
            candidate: rawCand.candidate,
            sdpMid: rawCand.sdpMid ?? null,
            sdpMLineIndex: rawCand.sdpMLineIndex ?? null,
            usernameFragment: rawCand.usernameFragment ?? null,
          };
          await pcManager.addIceCandidate(candidateInit);
        },
        onError: (error) => {
          logger.warn('[Signaling Diagnostic] Signaling socket error', error);
          toast.error(`Signaling Error: ${error.message}`);
        },
      });

      // Connect Presence socket & emit JOIN_ROOM
      if (!presenceSocket.connected) {
        presenceSocket.connect();
      }

      const joinPayload = {
        eventId: generateRoomId(),
        timestamp: Date.now(),
        userToken,
        roomId: targetRoomId,
        payload: {
          roomId: targetRoomId,
          displayName: isHost ? 'Host' : 'Viewer',
        },
      };
      presenceSocket.emit(PresenceEvents.JOIN_ROOM, joinPayload);
      logger.info('[Presence Diagnostic] Emitted JOIN_ROOM to /presence namespace', { roomId: targetRoomId });

      presenceSocket.on(PresenceEvents.ROOM_STATE, (room: Room) => {
        logger.info('[Presence Diagnostic] Received ROOM_STATE snapshot', {
          roomId: room.roomId,
          participantCount: room.participants.length,
        });

        const peer = room.participants.find((p) => p.userToken !== userToken);
        if (peer) {
          logger.info('[Presence Diagnostic] Identified peer from ROOM_STATE', {
            peerToken: peer.userToken,
            role: peer.role,
          });
          setPeerUserToken(peer.userToken);
          if (isHost && hasLocalTracksRef.current) {
            startNegotiation(peer.userToken);
          }
        }
      });

      presenceSocket.on(
        PresenceEvents.USER_JOINED,
        (data: { userToken: string; displayName: string; role: Role }) => {
          logger.info('[Presence Diagnostic] Received USER_JOINED broadcast', data);
          if (data.userToken !== userToken) {
            setPeerUserToken(data.userToken);
            toast.info(`${data.displayName} connected to room`);
            if (isHost && hasLocalTracksRef.current) {
              startNegotiation(data.userToken);
            }
          }
        },
      );

      presenceSocket.on(PresenceEvents.USER_LEFT, (data: { userToken: string }) => {
        logger.info('[Presence Diagnostic] Received USER_LEFT broadcast', data);
        if (data.userToken === peerUserTokenRef.current) {
          setPeerUserToken(null);
          setRemoteStream(null);
          toast.info('Peer disconnected from room');
        }
      });
    },
    [userToken, isHost, disconnectWebRTC, setPeerUserToken, startNegotiation, triggerIceRestart],
  );

  useEffect(() => {
    if (roomId) {
      connectSignaling(roomId);
    }
    return () => {
      disconnectWebRTC();
    };
  }, [roomId, isHost, connectSignaling, disconnectWebRTC]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    peerUserToken,
    remoteStream,
    stats,
    addLocalStream,
    removeLocalStream,
    replaceLocalTrack,
    setRoleTrack,
    triggerIceRestart,
    connectSignaling,
    startNegotiation,
    disconnectWebRTC,
  };
}
