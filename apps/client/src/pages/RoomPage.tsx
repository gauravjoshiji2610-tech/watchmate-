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

  // WebRTC P2P connection hook
  const {
    connectionState,
    remoteStream,
    peerUserToken,
    stats,
    replaceLocalTrack,
    setRoleTrack,
    startNegotiation,
  } = useWebRTC(currentRoomId, isHost);

  // Enumerate audio and video hardware devices
  const { audioInputs, videoInputs } = useMediaDevices();

  // Microphone manager hook with Web Audio processor
  const handleAudioTrackReplaced = useCallback(
    (track: MediaStreamTrack | null) => {
      setRoleTrack('micAudio', track);
    },
    [setRoleTrack],
  );

  const {
    isMicMuted,
    micVolume,
    activeMicId,
    toggleMic,
    setMicVolume,
    switchMicrophone,
  } = useMicrophone(handleAudioTrackReplaced);

  // Camera manager hook
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

  // Screen share & System Audio stream manager hook
  const handleScreenStreamChange = useCallback(
    (stream: MediaStream | null, systemAudioTrack: MediaStreamTrack | null) => {
      if (stream) {
        const videoTrack = stream.getVideoTracks()[0] || null;
        setRoleTrack('video', videoTrack, stream);
        if (systemAudioTrack) {
          setRoleTrack('systemAudio', systemAudioTrack, stream);
        } else {
          setRoleTrack('systemAudio', null);
        }
        if (peerUserToken) {
          startNegotiation(peerUserToken);
        }
      } else {
        setRoleTrack('video', null);
        setRoleTrack('systemAudio', null);
      }
    },
    [setRoleTrack, peerUserToken, startNegotiation],
  );

  const {
    isSharing,
    isSupported,
    hasSystemAudio,
    systemAudioVolume,
    isSystemAudioMuted,
    localStream: screenStream,
    error: screenShareError,
    startShare,
    stopShare,
    setSystemAudioVolume,
    toggleSystemAudioMute,
  } = useScreenShare(handleScreenStreamChange);

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
        micVolume={micVolume}
        isSystemAudioMuted={isSystemAudioMuted}
        systemAudioVolume={systemAudioVolume}
        hasSystemAudio={hasSystemAudio}
        isCameraOn={isCameraOn}
        audioInputs={audioInputs}
        videoInputs={videoInputs}
        activeMicId={activeMicId}
        activeCameraId={activeCameraId}
        preset={preset}
        onToggleScreenShare={toggleScreenShare}
        onToggleMic={toggleMic}
        onSetMicVolume={setMicVolume}
        onToggleSystemAudioMute={toggleSystemAudioMute}
        onSetSystemAudioVolume={setSystemAudioVolume}
        onToggleCamera={toggleCamera}
        onSwitchMic={switchMicrophone}
        onSwitchCamera={switchCamera}
        onChangeResolution={changeResolution}
      />

      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
};
