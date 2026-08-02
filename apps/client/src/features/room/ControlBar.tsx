import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video as Camera,
  VideoOff,
  Monitor,
  Maximize2,
  Minimize2,
  LogOut,
  Power,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { QualitySelector } from './QualitySelector';

export interface ControlBarProps {
  isHost?: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({ isHost = false }) => {
  const navigate = useNavigate();
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleMic = () => {
    setIsMicMuted(!isMicMuted);
    toast.info(!isMicMuted ? 'Microphone muted' : 'Microphone unmuted');
  };

  const toggleCamera = () => {
    setIsCameraOff(!isCameraOff);
    toast.info(!isCameraOff ? 'Camera turned off' : 'Camera turned on');
  };

  const handleScreenShareClick = () => {
    toast.warning('WebRTC Screen Share disabled in Phase 7 UI prototype', {
      description: 'WebRTC media streaming will be activated in Phase 8.',
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleLeaveRoom = () => {
    toast.info('Left the room');
    navigate('/');
  };

  const handleEndRoom = () => {
    toast.error('Room ended by host');
    navigate('/');
  };

  return (
    <footer className="h-20 w-full glass border-t border-slate-800/80 px-4 flex items-center justify-between gap-2 shrink-0">
      {/* Left: Quality Selector */}
      <div className="flex items-center gap-2">
        <QualitySelector />
      </div>

      {/* Center: Main Media Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant={isMicMuted ? 'danger' : 'secondary'}
          size="md"
          onClick={toggleMic}
          className="rounded-full p-3"
          aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </Button>

        <Button
          variant={isCameraOff ? 'secondary' : 'primary'}
          size="md"
          onClick={toggleCamera}
          className="rounded-full p-3"
          aria-label={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isCameraOff ? <VideoOff size={18} /> : <Camera size={18} />}
        </Button>

        {/* Screen Share Button (disabled for WebRTC Phase 8) */}
        <Button
          variant="primary"
          size="md"
          onClick={handleScreenShareClick}
          className="gap-2 px-5 rounded-full"
        >
          <Monitor size={18} />
          <span className="hidden sm:inline">Share Screen</span>
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={toggleFullscreen}
          className="rounded-full p-3 hidden sm:inline-flex"
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </Button>
      </div>

      {/* Right: Leave / End Room */}
      <div className="flex items-center gap-2">
        <Button
          variant="danger"
          size="sm"
          onClick={handleLeaveRoom}
          className="gap-1.5 rounded-xl"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Leave</span>
        </Button>

        {isHost && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleEndRoom}
            className="gap-1.5 bg-rose-700 hover:bg-rose-600 rounded-xl"
          >
            <Power size={14} />
            <span className="hidden sm:inline">End Room</span>
          </Button>
        )}
      </div>
    </footer>
  );
};
