import type { Socket } from 'socket.io-client';
import { generateRoomId } from '@antigravity/shared-utils';
import {
  SignalingEvents,
  SystemEvents,
  type EventEnvelope,
} from '@antigravity/shared-types';
import type { SdpPayload, IceCandidatePayload } from '@antigravity/shared-schemas';
import { getSignalingSocket } from '../socketService.js';
import { logger } from '../../lib/logger.js';

export interface SignalingServiceCallbacks {
  onOffer: (envelope: EventEnvelope<SdpPayload>) => void;
  onAnswer: (envelope: EventEnvelope<SdpPayload>) => void;
  onIceCandidate: (envelope: EventEnvelope<IceCandidatePayload>) => void;
  onError: (error: { code: string; message: string }) => void;
}

export class SignalingService {
  private socket: Socket | null = null;
  private userToken: string;
  private roomId: string | null = null;
  private callbacks: SignalingServiceCallbacks | null = null;

  constructor(userToken: string) {
    this.userToken = userToken;
  }

  connect(roomId: string, callbacks: SignalingServiceCallbacks): void {
    this.roomId = roomId;
    this.callbacks = callbacks;
    this.socket = getSignalingSocket(this.userToken);

    this.setupListeners();

    if (!this.socket.connected) {
      this.socket.connect();
    }

    logger.info('SignalingService connected to /signaling namespace', { roomId });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.off();
      this.socket.disconnect();
      this.socket = null;
    }
    this.roomId = null;
    this.callbacks = null;
    logger.info('SignalingService disconnected');
  }

  sendOffer(targetUserToken: string, sdp: RTCSessionDescriptionInit): void {
    if (!this.socket || !this.roomId) {
      logger.error('Cannot send offer: signaling socket not connected');
      return;
    }

    const payload: SdpPayload = {
      producerId: this.userToken,
      consumerId: targetUserToken,
      sdp: {
        type: sdp.type as 'offer',
        sdp: sdp.sdp,
      },
    };

    const envelope: EventEnvelope<SdpPayload> = {
      eventId: generateRoomId(),
      timestamp: Date.now(),
      userToken: this.userToken,
      roomId: this.roomId,
      payload,
    };

    this.socket.emit(SignalingEvents.OFFER, envelope);
    logger.info('Sent WebRTC SDP offer via signaling', { targetUserToken, roomId: this.roomId });
  }

  sendAnswer(targetUserToken: string, sdp: RTCSessionDescriptionInit): void {
    if (!this.socket || !this.roomId) {
      logger.error('Cannot send answer: signaling socket not connected');
      return;
    }

    const payload: SdpPayload = {
      producerId: this.userToken,
      consumerId: targetUserToken,
      sdp: {
        type: sdp.type as 'answer',
        sdp: sdp.sdp,
      },
    };

    const envelope: EventEnvelope<SdpPayload> = {
      eventId: generateRoomId(),
      timestamp: Date.now(),
      userToken: this.userToken,
      roomId: this.roomId,
      payload,
    };

    this.socket.emit(SignalingEvents.ANSWER, envelope);
    logger.info('Sent WebRTC SDP answer via signaling', { targetUserToken, roomId: this.roomId });
  }

  sendIceCandidate(targetUserToken: string, candidate: RTCIceCandidateInit): void {
    if (!this.socket || !this.roomId) {
      logger.error('Cannot send ICE candidate: signaling socket not connected');
      return;
    }

    const payload: IceCandidatePayload = {
      producerId: this.userToken,
      consumerId: targetUserToken,
      candidate: {
        candidate: candidate.candidate ?? '',
        sdpMid: candidate.sdpMid ?? null,
        sdpMLineIndex: candidate.sdpMLineIndex ?? null,
        usernameFragment: candidate.usernameFragment ?? null,
      },
    };

    const envelope: EventEnvelope<IceCandidatePayload> = {
      eventId: generateRoomId(),
      timestamp: Date.now(),
      userToken: this.userToken,
      roomId: this.roomId,
      payload,
    };

    this.socket.emit(SignalingEvents.ICE_CANDIDATE, envelope);
    logger.debug('Sent WebRTC ICE candidate via signaling', { targetUserToken });
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on(SignalingEvents.OFFER, (envelope: EventEnvelope<SdpPayload>) => {
      logger.info('Received WebRTC SDP offer', { from: envelope.payload.producerId });
      this.callbacks?.onOffer(envelope);
    });

    this.socket.on(SignalingEvents.ANSWER, (envelope: EventEnvelope<SdpPayload>) => {
      logger.info('Received WebRTC SDP answer', { from: envelope.payload.producerId });
      this.callbacks?.onAnswer(envelope);
    });

    this.socket.on(SignalingEvents.ICE_CANDIDATE, (envelope: EventEnvelope<IceCandidatePayload>) => {
      logger.debug('Received WebRTC ICE candidate', { from: envelope.payload.producerId });
      this.callbacks?.onIceCandidate(envelope);
    });

    this.socket.on(SystemEvents.SERVER_ERROR, (error: { code: string; message: string }) => {
      logger.warn('Signaling server error received', error);
      this.callbacks?.onError(error);
    });
  }
}
