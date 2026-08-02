import React, { useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TopBar } from '@/features/room/TopBar';
import { VideoContainer } from '@/features/room/VideoContainer';
import { ChatPanel } from '@/features/room/ChatPanel';
import { ControlBar } from '@/features/room/ControlBar';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useScreenShare } from '@/hooks/useScreenShare';
import { useMicrophone } from '@/hooks/useMicrophone';
import { useCamera } from '@/hooks/useCamera';
import { useMediaDevices } from '@/hooks/useMediaDevices';
import type { ResolutionPreset } from '@/services/media/CameraManager';

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();

  const locationState = location.state as { displayName?: string; isHost?: boolean } | null;
  const displayName = locationState?.displayName || 'User';
  const isHost = locationState?.isHost ?? false;

  const currentRoomId = roomId || 'demo-room';

  // WebRTC P2P connection hook (Phase 8A, 8B, 8C & 8D)
  const {
    connectionState,
    remoteStream,
    peerUserToken,
    stats,
    addLocalStream,
    removeLocalStream,
    replaceLocalTrack,
    startNegotiation,
  } = useWebRTC(currentRoomId, isHost);

  // Enumerate audio and video hardware devices (Phase 8C)
  const { audioInputs, videoInputs } = useMediaDevices();

  // Microphone manager hook (Phase 8C)
  const handleAudioTrackReplaced = useCallback(
    (track: MediaStreamTrack | null) => {
      replaceLocalTrack('audio', track);
    },
    [replaceLocalTrack],
  );

  const {
    isMicMuted,
    activeMicId,
    toggleMic,
    switchMicrophone,
  } = useMicrophone(handleAudioTrackReplaced);

  // Camera manager hook (Phase 8C)
  const handleVideoTrackReplaced = useCallback(
    (track: MediaStreamTrack | null) => {
      replaceLocalTrack('video', track);
    },
    [replaceLocalTrack],
  );

  const {
    isCameraOn,
    activeCameraId,
    cameraStream,
    preset,
    error: cameraError,
    toggleCamera,
    switchCamera,
    changeResolution,
  } = useCamera(handleVideoTrackReplaced);

  // Screen share stream manager hook (Phase 8B)
  const handleStreamChange = useCallback(
    (stream: MediaStream | null) => {
      if (stream) {
        addLocalStream(stream);
        if (peerUserToken) {
          startNegotiation(peerUserToken);
        }
      } else {
        removeLocalStream();
      }
    },
    [addLocalStream, removeLocalStream, peerUserToken, startNegotiation],
  );

  const {
    isSharing,
    isSupported,
    localStream: screenStream,
    error: screenShareError,
    startShare,
    stopShare,
  } = useScreenShare(handleStreamChange);

  const toggleScreenShare = () => {
    if (isSharing) {
      stopShare();
    } else {
      startShare();
    }
  };

  // Determine active displayed stream:
  // If host is screen sharing, show screenStream. Else if camera is on, show cameraStream.
  // Viewers see remoteStream.
  const activeStream = isHost
    ? isSharing
      ? screenStream
      : isCameraOn
        ? cameraStream
        : null
    : remoteStream;

  const displayError = screenShareError || cameraError;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <TopBar roomId={currentRoomId} isHost={isHost} webRTCState={connectionState} />

      {/* Main Content Area (Video Stream + Side Chat Panel) */}
      <main className="flex-1 w-full h-[calc(100vh-8rem)] p-3 sm:p-4 flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-hidden">
        <VideoContainer
          stream={activeStream}
          isLocal={isHost}
          isHost={isHost}
          isSupported={isSupported}
          error={displayError}
          stats={stats}
        />
        <ChatPanel displayName={displayName} />
      </main>

      {/* Bottom Controls Bar */}
      <ControlBar
        isHost={isHost}
        isSharing={isSharing}
        isSupported={isSupported}
        isMicMuted={isMicMuted}
        isCameraOn={isCameraOn}
        audioInputs={audioInputs}
        videoInputs={videoInputs}
        activeMicId={activeMicId}
        activeCameraId={activeCameraId}
        preset={preset}
        onToggleScreenShare={toggleScreenShare}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onSwitchMic={switchMicrophone}
        onSwitchCamera={switchCamera}
        onChangeResolution={changeResolution}
      />

      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
};
