/**
 * Empty hook stub for media device enumeration & WebRTC track acquisition.
 * Business logic will be implemented in Phase 8+.
 */
export function useMediaDevices() {
  return {
    audioDevices: [],
    videoDevices: [],
    selectedAudioId: null,
    selectedVideoId: null,
    getMediaStream: async () => null,
  };
}
