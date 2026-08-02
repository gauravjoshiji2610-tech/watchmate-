import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaDeviceManager } from '../services/media/MediaDeviceManager.js';

export function useMediaDevices() {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);

  const managerRef = useRef<MediaDeviceManager>(new MediaDeviceManager());

  const refreshDevices = useCallback(async () => {
    const { audioInputs: audio, videoInputs: video } = await managerRef.current.enumerateDevices();
    setAudioInputs(audio);
    setVideoInputs(video);
  }, []);

  useEffect(() => {
    refreshDevices();

    managerRef.current.onDeviceChange(() => {
      refreshDevices();
    });

    return () => {
      managerRef.current.offDeviceChange();
    };
  }, [refreshDevices]);

  return {
    audioInputs,
    videoInputs,
    refreshDevices,
  };
}
