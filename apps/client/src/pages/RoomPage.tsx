import React, { useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TopBar } from '@/features/room/TopBar';
import { VideoContainer } from '@/features/room/VideoContainer';
import { ChatPanel } from '@/features/room/ChatPanel';
import { ControlBar } from '@/features/room/ControlBar';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useScreenShare } from '@/hooks/useScreenShare';

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();

  const locationState = location.state as { displayName?: string; isHost?: boolean } | null;
  const displayName = locationState?.displayName || 'User';
  const isHost = locationState?.isHost ?? false;

  const currentRoomId = roomId || 'demo-room';

  // WebRTC P2P connection hook (Phase 8A & 8B)
  const {
    connectionState,
    remoteStream,
    peerUserToken,
    addLocalStream,
    removeLocalStream,
    startNegotiation,
  } = useWebRTC(currentRoomId, isHost);

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
    localStream,
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

  // Determine active video stream: host sees local preview, viewer sees remote stream
  const activeStream = isHost ? localStream : remoteStream;

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
          error={screenShareError}
        />
        <ChatPanel displayName={displayName} />
      </main>

      {/* Bottom Controls Bar */}
      <ControlBar
        isHost={isHost}
        isSharing={isSharing}
        isSupported={isSupported}
        onToggleScreenShare={toggleScreenShare}
      />

      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
};
