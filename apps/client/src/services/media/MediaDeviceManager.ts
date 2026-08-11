import { logger } from '../../lib/logger.js';

export interface DiscoveredDevices {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
}

export class MediaDeviceManager {
  private deviceChangeListener: (() => void) | null = null;

  /**
   * Enumerates available audio and video input devices.
   */
  async enumerateDevices(): Promise<DiscoveredDevices> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      logger.warn('enumerateDevices API not supported on this browser');
      return { audioInputs: [], videoInputs: [] };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');

      logger.info('Enumerated media devices', {
        audioCount: audioInputs.length,
        videoCount: videoInputs.length,
      });

      return { audioInputs, videoInputs };
    } catch (err) {
      logger.error('Failed to enumerate media devices', { err });
      return { audioInputs: [], videoInputs: [] };
    }
  }

  /**
   * Registers a listener for hardware device connect/disconnect events (e.g. USB mic plugged/unplugged).
   */
  onDeviceChange(callback: () => void): void {
    this.offDeviceChange();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      this.deviceChangeListener = () => {
        logger.info('Hardware devicechange event detected');
        callback();
      };
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeListener);
    }
  }

  /**
   * Unsubscribes from hardware devicechange events.
   */
  offDeviceChange(): void {
    if (this.deviceChangeListener && typeof navigator !== 'undefined' && navigator.mediaDevices?.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeListener);
      this.deviceChangeListener = null;
    }
  }
}
