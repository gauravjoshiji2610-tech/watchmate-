import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { CameraManager, type ResolutionPreset } from '../services/media/CameraManager.js';
import { logger } from '../lib/logger.js';

export function useCamera(onTrackReplaced?: (track: MediaStreamTrack | null) => void) {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [preset, setPreset] = useState<ResolutionPreset>('480p');
  const [error, setError] = useState<Error | null>(null);

  const managerRef = useRef<CameraManager>(new CameraManager());

  const stopCamera = useCallback(() => {
    managerRef.current.stopCamera();
    setCameraStream(null);
    setIsCameraOn(false);
    setActiveCameraId(null);
    onTrackReplaced?.(null);
    logger.info('Camera stopped');
  }, [onTrackReplaced]);

  const startCamera = useCallback(
    async (deviceId?: string, targetPreset?: ResolutionPreset) => {
      setError(null);
      try {
        const activePreset = targetPreset ?? preset;
        const stream = await managerRef.current.acquireCamera({
          deviceId,
          preset: activePreset,
        });

        setCameraStream(stream);
        setIsCameraOn(true);
        setPreset(activePreset);

        const track = stream.getVideoTracks()[0];
        setActiveCameraId(deviceId ?? track?.getSettings().deviceId ?? null);

        if (track) {
          onTrackReplaced?.(track);
        }

        toast.success(`Camera activated (${activePreset})`);
        return stream;
      } catch (err: unknown) {
        const e = err as Error;
        setError(e);
        toast.error(e.message);
        return null;
      }
    },
    [preset, onTrackReplaced],
  );

  const toggleCamera = useCallback(() => {
    if (isCameraOn) {
      stopCamera();
      toast.info('Camera turned off');
    } else {
      startCamera(activeCameraId ?? undefined);
    }
  }, [isCameraOn, activeCameraId, startCamera, stopCamera]);

  const switchCamera = useCallback(
    async (deviceId: string) => {
      logger.info('Switching camera device via replaceTrack()', { deviceId });
      const stream = await startCamera(deviceId, preset);
      if (stream) {
        toast.info('Camera device switched');
      }
    },
    [preset, startCamera],
  );

  const changeResolution = useCallback(
    async (newPreset: ResolutionPreset) => {
      setPreset(newPreset);
      if (isCameraOn) {
        await managerRef.current.applyResolution(newPreset);
        toast.info(`Camera resolution set to ${newPreset}`);
      }
    },
    [isCameraOn],
  );

  useEffect(() => {
    return () => {
      managerRef.current.stopCamera();
    };
  }, []);

  return {
    isCameraOn,
    activeCameraId,
    cameraStream,
    preset,
    error,
    startCamera,
    toggleCamera,
    switchCamera,
    changeResolution,
    stopCamera,
  };
}
