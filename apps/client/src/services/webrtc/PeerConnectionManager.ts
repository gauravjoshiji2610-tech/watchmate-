import { logger } from '../../lib/logger.js';
import { getRTCConfiguration } from './RTCConfig.js';
import { WebRTCStatsMonitor, type WebRTCStatsReport } from './WebRTCStatsMonitor.js';
import {
  mapPeerConnectionState,
  type WebRTCConnectionState,
} from './ConnectionState.js';

export interface PeerConnectionCallbacks {
  onStateChange: (state: WebRTCConnectionState) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onTrack?: (stream: MediaStream) => void;
  onStats?: (stats: WebRTCStatsReport) => void;
  onIceRestartRequired?: () => void;
}

export class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private callbacks: PeerConnectionCallbacks | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private statsMonitor: WebRTCStatsMonitor = new WebRTCStatsMonitor();

  initialize(callbacks: PeerConnectionCallbacks, customConfig?: RTCConfiguration): void {
    this.close();

    this.callbacks = callbacks;
    const config = customConfig ?? getRTCConfiguration();
    this.pc = new RTCPeerConnection(config);

    this.setupListeners();

    if (callbacks.onStats) {
      this.statsMonitor.start(this.pc, callbacks.onStats);
    }

    logger.info('RTCPeerConnection initialized with dynamic STUN/TURN configuration');
  }

  /**
   * Initiates ICE restart to recover from WiFi/Mobile network disconnects or ICE failure.
   */
  async restartIce(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      logger.info('Initiating WebRTC ICE restart');
      if (typeof this.pc.restartIce === 'function') {
        this.pc.restartIce();
      }

      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      logger.info('Created WebRTC ICE restart SDP offer');
      return offer;
    } catch (err) {
      logger.error('Failed to create WebRTC ICE restart offer', { err });
      throw err;
    }
  }

  /**
   * Adds local MediaStreamTracks to RTCPeerConnection using modern W3C addTrack() API.
   */
  addStream(stream: MediaStream): void {
    if (!this.pc) return;
    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream);
      logger.info('Added local track via RTCPeerConnection.addTrack()', { kind: track.kind, id: track.id });
    }
  }

  /**
   * Removes all local senders from RTCPeerConnection using modern W3C removeTrack() API.
   */
  removeStream(): void {
    if (!this.pc) return;
    const senders = this.pc.getSenders();
    for (const sender of senders) {
      if (sender.track) {
        this.pc.removeTrack(sender);
        logger.info('Removed sender track via RTCPeerConnection.removeTrack()');
      }
    }
  }

  /**
   * Seamlessly swaps a specific track (video or audio) on the active RTCRtpSender
   * using modern W3C RTCRtpSender.replaceTrack() API without re-negotiation.
   */
  async replaceTrack(kind: 'video' | 'audio', newTrack: MediaStreamTrack | null): Promise<void> {
    if (!this.pc) return;
    const senders = this.pc.getSenders();
    const sender = senders.find((s) => s.track?.kind === kind);
    if (sender) {
      await sender.replaceTrack(newTrack);
      logger.info(`Replaced ${kind} track via modern RTCRtpSender.replaceTrack()`, { trackId: newTrack?.id });
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      logger.info('Created WebRTC SDP offer');
      return offer;
    } catch (err) {
      logger.error('Failed to create WebRTC SDP offer', { err });
      throw err;
    }
  }

  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.processPendingCandidates();

      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      logger.info('Handled offer and created WebRTC SDP answer');
      return answer;
    } catch (err) {
      logger.error('Failed to handle offer or create answer', { err });
      throw err;
    }
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.processPendingCandidates();
      logger.info('Handled WebRTC SDP answer');
    } catch (err) {
      logger.error('Failed to set remote answer description', { err });
      throw err;
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;

    if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        logger.debug('Added remote ICE candidate');
      } catch (err) {
        logger.error('Failed to add remote ICE candidate', { err });
      }
    } else {
      // Queue candidate until remote description is set
      this.pendingCandidates.push(candidate);
      logger.debug('Queued remote ICE candidate (remote description pending)');
    }
  }

  close(): void {
    this.statsMonitor.stop();
    if (this.pc) {
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.close();
      this.pc = null;
      logger.info('RTCPeerConnection closed');
    }
    this.pendingCandidates = [];
    this.callbacks = null;
  }

  private setupListeners(): void {
    if (!this.pc) return;

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const mappedState = mapPeerConnectionState(this.pc.connectionState);
      logger.info('WebRTC Peer Connection State Changed', { state: mappedState });
      this.callbacks?.onStateChange(mappedState);
    };

    this.pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      const iceState = this.pc.iceConnectionState;
      logger.info('ICE Connection State Changed', { state: iceState });

      if (iceState === 'disconnected' || iceState === 'failed') {
        logger.warn('ICE connection state degraded (disconnected/failed). Triggering recovery hook.');
        this.callbacks?.onIceRestartRequired?.();
      }
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks?.onIceCandidate(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        logger.info('Received remote track from peer via ontrack', { trackId: event.track.id, kind: event.track.kind });
        this.callbacks?.onTrack?.(event.streams[0]);
      }
    };
  }

  private async processPendingCandidates(): Promise<void> {
    if (!this.pc || this.pendingCandidates.length === 0) return;

    for (const candidate of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        logger.error('Failed to process queued ICE candidate', { err });
      }
    }
    this.pendingCandidates = [];
  }
}
