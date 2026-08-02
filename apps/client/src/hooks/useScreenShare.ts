import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { ScreenShareManager } from '../services/webrtc/ScreenShareManager.js';
import { logger } from '../lib/logger.js';

export function useScreenShare(onStreamChanged?: (stream: MediaStream | null) => void) {
  const [isSharing, setIsSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const managerRef = useRef<ScreenShareManager>(new ScreenShareManager());
  const isSupported = ScreenShareManager.isSupported();

  const stopShare = useCallback(() => {
    managerRef.current.stopScreenShare();
    setLocalStream(null);
    setIsSharing(false);
    onStreamChanged?.(null);
    logger.info('Screen share stopped by user or system');
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
      onStreamChanged?.(stream);
      toast.success('Screen sharing active!');
      return stream;
    } catch (err: unknown) {
      const e = err as Error;
      setError(e);
      return null;
    }
  }, [isSupported, stopShare, onStreamChanged]);

  useEffect(() => {
    return () => {
      managerRef.current.stopScreenShare();
    };
  }, []);

  return {
    isSharing,
    isSupported,
    localStream,
    error,
    startShare,
    stopShare,
  };
}
