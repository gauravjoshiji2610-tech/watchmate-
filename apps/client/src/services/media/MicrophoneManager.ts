import { logger } from '../../lib/logger.js';

export interface MicrophoneOptions {
  deviceId?: string | undefined;
  echoCancellation?: boolean | undefined;
  noiseSuppression?: boolean | undefined;
  autoGainControl?: boolean | undefined;
}

export class MicrophoneManager {
  private stream: MediaStream | null = null;
  private isMuted = false;

  /**
   * Acquires microphone audio track using modern constraints.
   */
  async acquireMicrophone(options: MicrophoneOptions = {}): Promise<MediaStream> {
    this.stopMicrophone();

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: options.echoCancellation ?? true,
        noiseSuppression: options.noiseSuppression ?? true,
        autoGainControl: options.autoGainControl ?? true,
        ...(options.deviceId ? { deviceId: { exact: options.deviceId } } : {}),
      },
      video: false,
    };

    try {
      logger.info('Acquiring microphone audio stream', { deviceId: options.deviceId });
      const audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = audioStream;

      const track = audioStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !this.isMuted;
      }

      logger.info('Microphone acquired successfully', { trackId: track?.id, label: track?.label });
      return audioStream;
    } catch (err: unknown) {
      const error = err as Error & { code?: string; name?: string };
      logger.error('Failed to acquire microphone', { name: error.name, message: error.message });

      if (error.name === 'NotAllowedError') {
        error.code = 'ERR_MIC_PERMISSION_DENIED';
        error.message = 'Microphone permission was denied by the user';
      } else if (error.name === 'NotFoundError') {
        error.code = 'ERR_MIC_NOT_FOUND';
        error.message = 'No microphone device was found on this system';
      }
      throw error;
    }
  }

  /**
   * Toggles mute status of the active microphone track.
   */
  setMuted(muted: boolean): boolean {
    this.isMuted = muted;
    if (this.stream) {
      const track = this.stream.getAudioTracks()[0];
      if (track) {
        track.enabled = !muted;
        logger.info(`Microphone track ${muted ? 'disabled (muted)' : 'enabled (unmuted)'}`);
      }
    }
    return this.isMuted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  getTrack(): MediaStreamTrack | null {
    return this.stream?.getAudioTracks()[0] ?? null;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Stops all audio tracks and cleans up resources.
   */
  stopMicrophone(): void {
    if (this.stream) {
      for (const track of this.stream.getAudioTracks()) {
        track.stop();
        logger.info('Stopped audio MediaStreamTrack', { trackId: track.id });
      }
      this.stream = null;
    }
  }
}
