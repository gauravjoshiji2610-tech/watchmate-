import { logger } from '../../lib/logger.js';

export type ResolutionPreset = 'auto' | '480p' | '720p' | '1080p';

export interface CameraOptions {
  deviceId?: string | undefined;
  preset?: ResolutionPreset | undefined;
}

const PRESET_CONSTRAINTS: Record<ResolutionPreset, MediaTrackConstraints> = {
  auto: {},
  '480p': { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
  '720p': { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  '1080p': { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
};

export class CameraManager {
  private stream: MediaStream | null = null;
  private currentPreset: ResolutionPreset = '480p';

  /**
   * Acquires camera video stream using specified resolution constraints.
   */
  async acquireCamera(options: CameraOptions = {}): Promise<MediaStream> {
    this.stopCamera();

    const preset = options.preset ?? this.currentPreset;
    this.currentPreset = preset;

    const videoConstraints: MediaTrackConstraints = {
      ...PRESET_CONSTRAINTS[preset],
      ...(options.deviceId ? { deviceId: { exact: options.deviceId } } : {}),
    };

    const constraints: MediaStreamConstraints = {
      video: videoConstraints,
      audio: false,
    };

    try {
      logger.info('Acquiring camera video stream', { deviceId: options.deviceId, preset });
      const videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = videoStream;

      const track = videoStream.getVideoTracks()[0];
      logger.info('Camera acquired successfully', { trackId: track?.id, label: track?.label, preset });

      return videoStream;
    } catch (err: unknown) {
      const error = err as Error & { code?: string; name?: string };
      logger.error('Failed to acquire camera', { name: error.name, message: error.message });

      if (error.name === 'NotAllowedError') {
        error.code = 'ERR_CAMERA_PERMISSION_DENIED';
        error.message = 'Camera permission was denied by the user';
      } else if (error.name === 'NotFoundError') {
        error.code = 'ERR_CAMERA_NOT_FOUND';
        error.message = 'No camera device was found on this system';
      }
      throw error;
    }
  }

  /**
   * Applies resolution constraints to the active video track dynamically.
   */
  async applyResolution(preset: ResolutionPreset): Promise<void> {
    this.currentPreset = preset;
    const track = this.getTrack();

    if (track && track.applyConstraints) {
      try {
        await track.applyConstraints(PRESET_CONSTRAINTS[preset]);
        logger.info('Applied resolution constraints to active camera track', { preset });
      } catch (err) {
        logger.error('Failed to apply resolution constraints', { err });
      }
    }
  }

  getTrack(): MediaStreamTrack | null {
    return this.stream?.getVideoTracks()[0] ?? null;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getCurrentPreset(): ResolutionPreset {
    return this.currentPreset;
  }

  /**
   * Stops all video tracks and cleans up resources.
   */
  stopCamera(): void {
    if (this.stream) {
      for (const track of this.stream.getVideoTracks()) {
        track.stop();
        logger.info('Stopped video MediaStreamTrack', { trackId: track.id });
      }
      this.stream = null;
    }
  }
}
