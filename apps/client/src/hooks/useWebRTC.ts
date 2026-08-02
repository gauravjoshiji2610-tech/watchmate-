import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { EventEnvelope } from '@antigravity/shared-types';
import type { SdpPayload, IceCandidatePayload } from '@antigravity/shared-schemas';
import { PeerConnectionManager } from '../services/webrtc/PeerConnectionManager.js';
import { SignalingService } from '../services/webrtc/SignalingService.js';
import type { WebRTCConnectionState } from '../services/webrtc/ConnectionState.js';
import { getOrCreateUserToken } from '../services/roomService.js';
import { logger } from '../lib/logger.js';

export function useWebRTC(roomId?: string, isHost = false) {
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>('new');
  const [peerUserToken, setPeerUserToken] = useState<string | null>(null);

  const pcManagerRef = useRef<PeerConnectionManager | null>(null);
  const signalingRef = useRef<SignalingService | null>(null);

  const userToken = getOrCreateUserToken();

  const disconnectWebRTC = useCallback(() => {
    pcManagerRef.current?.close();
    signalingRef.current?.disconnect();
    pcManagerRef.current = null;
    signalingRef.current = null;
    setConnectionState('closed');
    setPeerUserToken(null);
    logger.info('WebRTC hook cleaned up');
  }, []);

  const connectSignaling = useCallback(
    (targetRoomId: string) => {
      disconnectWebRTC();

      const pcManager = new PeerConnectionManager();
      const signaling = new SignalingService(userToken);

      pcManagerRef.current = pcManager;
      signalingRef.current = signaling;

      pcManager.initialize({
        onStateChange: (state) => {
          setConnectionState(state);
          if (state === 'connected') {
            toast.success('P2P WebRTC Peer Connection Established!');
          } else if (state === 'failed') {
            toast.error('WebRTC Peer Connection Failed');
          }
        },
        onIceCandidate: (candidate) => {
          if (peerUserToken) {
            signaling.sendIceCandidate(peerUserToken, candidate.toJSON());
          }
        },
      });

      signaling.connect(targetRoomId, {
        onOffer: async (envelope: EventEnvelope<SdpPayload>) => {
          try {
            setPeerUserToken(envelope.payload.producerId);
            const rawSdp = envelope.payload.sdp;
            const rtcOffer: RTCSessionDescriptionInit = rawSdp.sdp
              ? { type: rawSdp.type, sdp: rawSdp.sdp }
              : { type: rawSdp.type };

            const answer = await pcManager.handleOffer(rtcOffer);
            signaling.sendAnswer(envelope.payload.producerId, answer);
          } catch (err) {
            toast.error('Failed to handle incoming WebRTC offer');
          }
        },
        onAnswer: async (envelope: EventEnvelope<SdpPayload>) => {
          try {
            const rawSdp = envelope.payload.sdp;
            const rtcAnswer: RTCSessionDescriptionInit = rawSdp.sdp
              ? { type: rawSdp.type, sdp: rawSdp.sdp }
              : { type: rawSdp.type };

            await pcManager.handleAnswer(rtcAnswer);
          } catch (err) {
            toast.error('Failed to process incoming WebRTC answer');
          }
        },
        onIceCandidate: async (envelope: EventEnvelope<IceCandidatePayload>) => {
          const rawCand = envelope.payload.candidate;
          const candidateInit: RTCIceCandidateInit = {
            candidate: rawCand.candidate,
            sdpMid: rawCand.sdpMid ?? null,
            sdpMLineIndex: rawCand.sdpMLineIndex ?? null,
            usernameFragment: rawCand.usernameFragment ?? null,
          };
          await pcManager.addIceCandidate(candidateInit);
        },
        onError: (error) => {
          toast.error(`Signaling Error: ${error.message}`);
        },
      });
    },
    [userToken, peerUserToken, disconnectWebRTC],
  );

  const startNegotiation = useCallback(
    async (targetUserToken: string) => {
      if (!pcManagerRef.current || !signalingRef.current) {
        toast.error('WebRTC not initialized');
        return;
      }

      try {
        setPeerUserToken(targetUserToken);
        const offer = await pcManagerRef.current.createOffer();
        signalingRef.current.sendOffer(targetUserToken, offer);
        toast.info('Sending WebRTC P2P offer to peer...');
      } catch (err) {
        toast.error('Failed to create WebRTC offer');
      }
    },
    [],
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
    connectSignaling,
    startNegotiation,
    disconnectWebRTC,
  };
}
