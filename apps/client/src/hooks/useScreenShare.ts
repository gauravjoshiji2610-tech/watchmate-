import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ScreenShareManager } from '../services/webrtc/ScreenShareManager.js';
import { AudioProcessor } from '../services/media/AudioProcessor.js';
import { logger } from '../lib/logger.js';

const SYSTEM_VOLUME_KEY = 'watchmate_system_volume';
const SYSTEM_MUTED_KEY = 'watchmate_system_muted';

export interface ScreenShareHookCallbacks {
  onStreamChanged?: (videoStream: MediaStream | null, systemAudioTrack: MediaStreamTrack | null) => void;
}

export function useScreenShare(onStreamChanged?: (videoStream: MediaStream | null, systemAudioTrack: MediaStreamTrack | null) => void) {
  const [isSharing, setIsSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);

  const [systemAudioVolume, setSystemAudioVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem(SYSTEM_VOLUME_KEY);
    return saved ? Math.max(0, Math.min(100, Number(saved))) : 100;
  });

  const [isSystemAudioMuted, setIsSystemAudioMutedState] = useState<boolean>(() => {
    return localStorage.getItem(SYSTEM_MUTED_KEY) === 'true';
  });

  const [error, setError] = useState<Error | null>(null);

  const managerRef = useRef<ScreenShareManager>(new ScreenShareManager());
  const processorRef = useRef<AudioProcessor>(new AudioProcessor('SystemAudioProcessor'));

  const isSupported = ScreenShareManager.isSupported();

  const stopShare = useCallback(() => {
    processorRef.current.cleanup();
    managerRef.current.stopScreenShare();
    setLocalStream(null);
    setIsSharing(false);
    setHasSystemAudio(false);
    onStreamChanged?.(null, null);
    logger.info('Screen share and system audio stopped');
  }, [onStreamChanged]);

  const startShare = useCallback(async () => {
    setError(null);

    if (!isSupported) {
      const err = new Error('Screen sharing is not supported on this browser/device (e.g. iOS Safari)');
      setError(err);
      toast.error('Browser Unsupported', {
        description: 'iOS Safari cannot share screen. Viewers on iOS can watch screen shares from desktop hosts.',
      });
      return null;
    }

    try {
      const stream = await managerRef.current.startScreenShare({
        onEnded: () => {
          stopShare();
          toast.info('Screen sharing ended');
        },
        onError: (err) => {
          setError(err);
          toast.error(err.message);
        },
      });

      setLocalStream(stream);
      setIsSharing(true);

      const rawSystemTrack = managerRef.current.getSystemAudioTrack();
      let processedSystemTrack: MediaStreamTrack | null = null;

      if (rawSystemTrack) {
        setHasSystemAudio(true);
        processedSystemTrack = processorRef.current.processTrack(rawSystemTrack, systemAudioVolume, isSystemAudioMuted);
        toast.success('Screen sharing active with System Audio!');
      } else {
        setHasSystemAudio(false);
        toast.info('Screen sharing active', {
          description: 'Note: System audio was not captured. Make sure "Share audio" is checked when selecting a tab or window.',
        });
      }

      onStreamChanged?.(stream, processedSystemTrack);
      return stream;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e);
      return null;
    }
  }, [isSupported, systemAudioVolume, isSystemAudioMuted, stopShare, onStreamChanged]);

  const setSystemAudioVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    setSystemAudioVolumeState(clamped);
    localStorage.setItem(SYSTEM_VOLUME_KEY, clamped.toString());
    processorRef.current.setVolume(clamped);
  }, []);

  const toggleSystemAudioMute = useCallback(() => {
    const newMutedState = !isSystemAudioMuted;
    setIsSystemAudioMutedState(newMutedState);
    localStorage.setItem(SYSTEM_MUTED_KEY, newMutedState.toString());
    processorRef.current.setMuted(newMutedState);
    toast.info(newMutedState ? 'System audio muted' : 'System audio unmuted');
  }, [isSystemAudioMuted]);

  const setSystemAudioMuted = useCallback((muted: boolean) => {
    setIsSystemAudioMutedState(muted);
    localStorage.setItem(SYSTEM_MUTED_KEY, muted.toString());
    processorRef.current.setMuted(muted);
  }, []);

  useEffect(() => {
    return () => {
      processorRef.current.cleanup();
      managerRef.current.stopScreenShare();
    };
  }, []);

  return {
    isSharing,
    isSupported,
    localStream,
    hasSystemAudio,
    systemAudioVolume,
    isSystemAudioMuted,
    error,
    startShare,
    stopShare,
    setSystemAudioVolume,
    toggleSystemAudioMute,
    setSystemAudioMuted,
  };
}
