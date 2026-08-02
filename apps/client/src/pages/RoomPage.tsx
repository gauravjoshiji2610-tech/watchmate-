import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TopBar } from '@/features/room/TopBar';
import { VideoContainer } from '@/features/room/VideoContainer';
import { ChatPanel } from '@/features/room/ChatPanel';
import { ControlBar } from '@/features/room/ControlBar';
import { useWebRTC } from '@/hooks/useWebRTC';

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();

  const locationState = location.state as { displayName?: string; isHost?: boolean } | null;
  const displayName = locationState?.displayName || 'User';
  const isHost = locationState?.isHost ?? false;

  const currentRoomId = roomId || 'demo-room';

  // Initialize WebRTC signaling and peer connection lifecycle (Phase 8A)
  const { connectionState } = useWebRTC(currentRoomId, isHost);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <TopBar roomId={currentRoomId} isHost={isHost} webRTCState={connectionState} />

      {/* Main Content Area (Video Stream + Side Chat Panel) */}
      <main className="flex-1 w-full h-[calc(100vh-8rem)] p-3 sm:p-4 flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-hidden">
        <VideoContainer isHost={isHost} />
        <ChatPanel displayName={displayName} />
      </main>

      {/* Bottom Controls Bar */}
      <ControlBar isHost={isHost} />

      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
};
