import { logger } from '../../lib/logger.js';

/**
 * AudioProcessor — Web Audio API GainNode wrapper.
 *
 * Provides independent volume scaling (0% to 100%) and non-destructive muting
 * for any audio MediaStreamTrack (Microphone or System/Device Audio) BEFORE
 * transmitting over WebRTC.
 *
 * Pipeline:
 * Raw Track → MediaStreamAudioSourceNode → GainNode → MediaStreamAudioDestinationNode → Processed Track → WebRTC Sender
 */
export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private rawTrack: MediaStreamTrack | null = null;
  private processedTrack: MediaStreamTrack | null = null;

  private volume = 100;
  private isMuted = false;
  private name: string;

  constructor(name = 'AudioProcessor') {
    this.name = name;
  }

  /**
   * Initializes Web Audio nodes for an input audio track and returns the processed output track.
   */
  processTrack(inputTrack: MediaStreamTrack, initialVolume = 100, initialMuted = false): MediaStreamTrack {
    this.cleanup();

    this.rawTrack = inputTrack;
    this.volume = initialVolume;
    this.isMuted = initialMuted;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.audioContext = new AudioCtx();

      const mediaStream = new MediaStream([inputTrack]);
      this.sourceNode = this.audioContext.createMediaStreamSource(mediaStream);

      this.gainNode = this.audioContext.createGain();
      this.applyGain();

      this.destinationNode = this.audioContext.createMediaStreamDestination();

      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.destinationNode);

      this.processedTrack = this.destinationNode.stream.getAudioTracks()[0] || null;

      if (this.processedTrack) {
        this.processedTrack.enabled = !this.isMuted;
      }

      logger.info(`[${this.name}] Web Audio API node initialized`, {
        rawTrackId: inputTrack.id,
        processedTrackId: this.processedTrack?.id,
        volume: this.volume,
        isMuted: this.isMuted,
      });

      return this.processedTrack || inputTrack;
    } catch (err) {
      logger.error(`[${this.name}] Web Audio API setup failed, using raw track fallback`, { err });
      return inputTrack;
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(100, volume));
    this.applyGain();
    logger.info(`[${this.name}] Volume adjusted to ${this.volume}%`);
  }

  getVolume(): number {
    return this.volume;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.applyGain();
    if (this.rawTrack) {
      this.rawTrack.enabled = !muted;
    }
    if (this.processedTrack) {
      this.processedTrack.enabled = !muted;
    }
    logger.info(`[${this.name}] Mute state set to ${muted}`);
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  getProcessedTrack(): MediaStreamTrack | null {
    return this.processedTrack || this.rawTrack;
  }

  cleanup(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        /* ignore */
      }
      this.sourceNode = null;
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        /* ignore */
      }
      this.gainNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        void this.audioContext.close();
      } catch {
        /* ignore */
      }
      this.audioContext = null;
    }

    this.destinationNode = null;
    this.rawTrack = null;
    this.processedTrack = null;
    logger.info(`[${this.name}] Cleaned up Web Audio nodes`);
  }

  private applyGain(): void {
    if (!this.gainNode || !this.audioContext) return;
    const targetGain = this.isMuted ? 0 : this.volume / 100;
    try {
      this.gainNode.gain.setValueAtTime(targetGain, this.audioContext.currentTime);
    } catch (err) {
      logger.error(`[${this.name}] Failed to set gain value`, { err });
    }
  }
}
