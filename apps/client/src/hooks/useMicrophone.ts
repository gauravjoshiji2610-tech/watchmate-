import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { MicrophoneManager } from '../services/media/MicrophoneManager.js';
import { logger } from '../lib/logger.js';

export function useMicrophone(onTrackReplaced?: (track: MediaStreamTrack | null) => void) {
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [activeMicId, setActiveMicId] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const managerRef = useRef<MicrophoneManager>(new MicrophoneManager());

  const stopMicrophone = useCallback(() => {
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

        const track = stream.getAudioTracks()[0];
        setActiveMicId(deviceId ?? track?.getSettings().deviceId ?? null);

        if (track) {
          onTrackReplaced?.(track);
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
    [onTrackReplaced],
  );

  const toggleMic = useCallback(() => {
    const newMutedState = !isMicMuted;
    const resultMuted = managerRef.current.setMuted(newMutedState);
    setIsMicMuted(resultMuted);
    toast.info(resultMuted ? 'Microphone muted' : 'Microphone unmuted');
  }, [isMicMuted]);

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
      managerRef.current.stopMicrophone();
    };
  }, []);

  return {
    isMicMuted,
    activeMicId,
    audioStream,
    error,
    startMicrophone,
    toggleMic,
    switchMicrophone,
    stopMicrophone,
  };
}
