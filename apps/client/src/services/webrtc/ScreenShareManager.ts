import { logger } from '../../lib/logger.js';

export interface ScreenShareCallbacks {
  onEnded: () => void;
  onError: (error: Error & { code?: string }) => void;
}

export class ScreenShareManager {
  private stream: MediaStream | null = null;
  private callbacks: ScreenShareCallbacks | null = null;

  /**
   * Checks if screen capture is supported on the current browser/device.
   * iOS Safari returns false (viewer only).
   */
  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices !== 'undefined' &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function'
    );
  }

  /**
   * Requests screen capture stream from the browser.
   * Host only. Viewer must never invoke this.
   */
  async startScreenShare(callbacks: ScreenShareCallbacks): Promise<MediaStream> {
    this.stopScreenShare(); // Clean up existing stream if any

    this.callbacks = callbacks;

    if (!ScreenShareManager.isSupported()) {
      logger.warn('Screen share attempt rejected: browser/device does not support getDisplayMedia()');
      const err = new Error('Screen sharing is not supported on this browser/device (e.g. iOS Safari)');
      (err as Error & { code?: string }).code = 'ERR_UNSUPPORTED_BROWSER';
      throw err;
    }

    try {
      logger.info('Requesting screen capture stream with system audio via getDisplayMedia()');
      let displayStream: MediaStream;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            cursor: 'always',
          } as MediaTrackConstraints,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          } as MediaTrackConstraints,
        });
      } catch {
        logger.info('Detailed system audio constraints rejected, falling back to audio: true');
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            cursor: 'always',
          } as MediaTrackConstraints,
          audio: true,
        });
      }

      this.stream = displayStream;

      const videoTrack = displayStream.getVideoTracks()[0];
      const systemAudioTrack = displayStream.getAudioTracks()[0];

      if (videoTrack) {
        // Handle native browser "Stop Sharing" button, window close, or stream revocation
        videoTrack.onended = () => {
          logger.info('Native screen share track ended (track.onended fired)');
          this.stopScreenShare();
          this.callbacks?.onEnded();
        };
      }

      logger.info('Screen share stream acquired successfully', {
        videoTrackId: videoTrack?.id,
        systemAudioTrackId: systemAudioTrack?.id,
        hasSystemAudio: Boolean(systemAudioTrack),
      });

      return displayStream;
    } catch (err: unknown) {
      const error = err as Error & { code?: string; name?: string };
      logger.warn('getDisplayMedia() failed or permission denied', { name: error.name, message: error.message });

      if (error.name === 'NotAllowedError') {
        error.code = 'ERR_PERMISSION_DENIED';
        error.message = 'Screen sharing permission was denied by the user';
      } else if (error.name === 'NotFoundError') {
        error.code = 'ERR_DEVICE_UNAVAILABLE';
        error.message = 'No screen capture source was available';
      } else {
        error.code = error.code ?? 'ERR_MEDIA_UNKNOWN';
      }

      this.callbacks?.onError(error);
      throw error;
    }
  }

  /**
   * Stops all MediaStreamTracks and cleans up resources.
   */
  stopScreenShare(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.onended = null;
        track.stop();
        logger.info('Stopped MediaStreamTrack', { trackId: track.id, kind: track.kind });
      }
      this.stream = null;
    }
    this.callbacks = null;
  }

  /**
   * Returns current active MediaStream or null.
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  getSystemAudioTrack(): MediaStreamTrack | null {
    return this.stream?.getAudioTracks()[0] ?? null;
  }

  getVideoTrack(): MediaStreamTrack | null {
    return this.stream?.getVideoTracks()[0] ?? null;
  }
}
