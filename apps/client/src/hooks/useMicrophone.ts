import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { MicrophoneManager } from '../services/media/MicrophoneManager.js';
import { AudioProcessor } from '../services/media/AudioProcessor.js';
import { logger } from '../lib/logger.js';

const MIC_VOLUME_KEY = 'watchmate_mic_volume';
const MIC_MUTED_KEY = 'watchmate_mic_muted';

export function useMicrophone(onTrackReplaced?: (track: MediaStreamTrack | null) => void) {
  const [micVolume, setMicVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem(MIC_VOLUME_KEY);
    return saved ? Math.max(0, Math.min(100, Number(saved))) : 100;
  });

  const [isMicMuted, setIsMicMutedState] = useState<boolean>(() => {
    return localStorage.getItem(MIC_MUTED_KEY) === 'true';
  });

  const [activeMicId, setActiveMicId] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const managerRef = useRef<MicrophoneManager>(new MicrophoneManager());
  const processorRef = useRef<AudioProcessor>(new AudioProcessor('MicrophoneProcessor'));

  const stopMicrophone = useCallback(() => {
    processorRef.current.cleanup();
    managerRef.current.stopMicrophone();
    setAudioStream(null);
    setActiveMicId(null);
    onTrackReplaced?.(null);
    logger.info('Microphone stopped');
  }, [onTrackReplaced]);

  const startMicrophone = useCallback(
    async (deviceId?: string) => {
      setError(null);
      try {
        const stream = await managerRef.current.acquireMicrophone({ deviceId });
        setAudioStream(stream);

        const rawTrack = stream.getAudioTracks()[0];
        setActiveMicId(deviceId ?? rawTrack?.getSettings().deviceId ?? null);

        if (rawTrack) {
          const processedTrack = processorRef.current.processTrack(rawTrack, micVolume, isMicMuted);
          onTrackReplaced?.(processedTrack);
        }

        toast.success('Microphone activated');
        return stream;
      } catch (err: unknown) {
        const e = err as Error;
        setError(e);
        toast.error(e.message);
        return null;
      }
    },
    [micVolume, isMicMuted, onTrackReplaced],
  );

  const setMicVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(100, volume));
    setMicVolumeState(clamped);
    localStorage.setItem(MIC_VOLUME_KEY, clamped.toString());
    processorRef.current.setVolume(clamped);
  }, []);

  const toggleMic = useCallback(() => {
    const newMutedState = !isMicMuted;
    setIsMicMutedState(newMutedState);
    localStorage.setItem(MIC_MUTED_KEY, newMutedState.toString());
    managerRef.current.setMuted(newMutedState);
    processorRef.current.setMuted(newMutedState);
    toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
  }, [isMicMuted]);

  const setMicMuted = useCallback((muted: boolean) => {
    setIsMicMutedState(muted);
    localStorage.setItem(MIC_MUTED_KEY, muted.toString());
    managerRef.current.setMuted(muted);
    processorRef.current.setMuted(muted);
  }, []);

  const switchMicrophone = useCallback(
    async (deviceId: string) => {
      logger.info('Switching microphone device via replaceTrack()', { deviceId });
      const stream = await startMicrophone(deviceId);
      if (stream) {
        toast.info('Microphone device switched');
      }
    },
    [startMicrophone],
  );

  useEffect(() => {
    return () => {
      processorRef.current.cleanup();
      managerRef.current.stopMicrophone();
    };
  }, []);

  return {
    isMicMuted,
    micVolume,
    activeMicId,
    audioStream,
    error,
    startMicrophone,
    toggleMic,
    setMicMuted,
    setMicVolume,
    switchMicrophone,
    stopMicrophone,
  };
}
