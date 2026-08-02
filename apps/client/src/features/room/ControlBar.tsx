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
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { QualitySelector } from './QualitySelector';
import type { ResolutionPreset } from '@/services/media/CameraManager';

export interface ControlBarProps {
  isHost?: boolean;
  isSharing?: boolean;
  isSupported?: boolean;
  isMicMuted?: boolean;
  isCameraOn?: boolean;
  audioInputs?: MediaDeviceInfo[];
  videoInputs?: MediaDeviceInfo[];
  activeMicId?: string | null;
  activeCameraId?: string | null;
  preset?: ResolutionPreset;
  onToggleScreenShare?: () => void;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onSwitchMic?: (deviceId: string) => void;
  onSwitchCamera?: (deviceId: string) => void;
  onChangeResolution?: (preset: ResolutionPreset) => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isHost = false,
  isSharing = false,
  isSupported = true,
  isMicMuted = false,
  isCameraOn = false,
  audioInputs = [],
  videoInputs = [],
  activeMicId = null,
  activeCameraId = null,
  preset = '480p',
  onToggleScreenShare,
  onToggleMic,
  onToggleCamera,
  onSwitchMic,
  onSwitchCamera,
  onChangeResolution,
}) => {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMicMenuOpen, setIsMicMenuOpen] = useState(false);
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);

  const handleScreenShareClick = () => {
    if (!isHost) {
      toast.error('Only the host can share their screen');
      return;
    }
    if (!isSupported) {
      toast.error('Screen sharing is not supported on this browser/device');
      return;
    }
    onToggleScreenShare?.();
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
        <QualitySelector currentPreset={preset} onSelectPreset={onChangeResolution} />
      </div>

      {/* Center: Main Media Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Microphone Button & Device Selector */}
        <div className="relative flex items-center">
          <Button
            variant={isMicMuted ? 'danger' : 'secondary'}
            size="md"
            onClick={onToggleMic}
            className="rounded-l-full rounded-r-none px-3.5"
            aria-label={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </Button>
          <button
            type="button"
            onClick={() => {
              setIsMicMenuOpen(!isMicMenuOpen);
              setIsCameraMenuOpen(false);
            }}
            aria-label="Select audio input device"
            className={`p-2.5 rounded-r-full border-l border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500 ${
              isMicMuted ? 'bg-rose-900/40 text-rose-300' : 'bg-slate-900/90'
            }`}
          >
            <ChevronUp size={14} />
          </button>

          {isMicMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-64 glass rounded-xl border border-slate-800 p-2 space-y-1 z-50 shadow-2xl">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Microphones ({audioInputs.length})
              </div>
              {audioInputs.length === 0 ? (
                <div className="text-xs text-slate-500 px-2 py-1">No microphones found</div>
              ) : (
                audioInputs.map((device, idx) => (
                  <button
                    key={device.deviceId || idx}
                    type="button"
                    onClick={() => {
                      onSwitchMic?.(device.deviceId);
                      setIsMicMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium truncate transition-colors focus:outline-none focus:bg-slate-800 ${
                      activeMicId === device.deviceId
                        ? 'bg-brand-600 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {device.label || `Microphone ${idx + 1}`}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Camera Button & Device Selector */}
        <div className="relative flex items-center">
          <Button
            variant={isCameraOn ? 'primary' : 'secondary'}
            size="md"
            onClick={onToggleCamera}
            className="rounded-l-full rounded-r-none px-3.5"
            aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCameraOn ? <Camera size={18} /> : <VideoOff size={18} />}
          </Button>
          <button
            type="button"
            onClick={() => {
              setIsCameraMenuOpen(!isCameraMenuOpen);
              setIsMicMenuOpen(false);
            }}
            aria-label="Select video input device"
            className={`p-2.5 rounded-r-full border-l border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500 ${
              isCameraOn ? 'bg-brand-900/40 text-brand-300' : 'bg-slate-900/90'
            }`}
          >
            <ChevronUp size={14} />
          </button>

          {isCameraMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-64 glass rounded-xl border border-slate-800 p-2 space-y-1 z-50 shadow-2xl">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Cameras ({videoInputs.length})
              </div>
              {videoInputs.length === 0 ? (
                <div className="text-xs text-slate-500 px-2 py-1">No cameras found</div>
              ) : (
                videoInputs.map((device, idx) => (
                  <button
                    key={device.deviceId || idx}
                    type="button"
                    onClick={() => {
                      onSwitchCamera?.(device.deviceId);
                      setIsCameraMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium truncate transition-colors focus:outline-none focus:bg-slate-800 ${
                      activeCameraId === device.deviceId
                        ? 'bg-brand-600 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {device.label || `Camera ${idx + 1}`}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Screen Share Button (Host Only) */}
        {isHost && (
          <Button
            variant={isSharing ? 'danger' : 'primary'}
            size="md"
            onClick={handleScreenShareClick}
            className="gap-2 px-5 rounded-full"
            aria-label={isSharing ? 'Stop screen sharing' : 'Start screen sharing'}
          >
            <Monitor size={18} />
            <span className="hidden sm:inline">
              {isSharing ? 'Stop Sharing' : 'Share Screen'}
            </span>
          </Button>
        )}

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
          aria-label="Leave room"
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
            aria-label="End room for all participants"
          >
            <Power size={14} />
            <span className="hidden sm:inline">End Room</span>
          </Button>
        )}
      </div>
    </footer>
  );
};
