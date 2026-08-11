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
  Sliders,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { QualitySelector } from './QualitySelector';
import { isCurrentlyFullscreen, requestElementFullscreen, exitElementFullscreen } from '@/lib/fullscreen';
import type { ResolutionPreset } from '@/services/media/CameraManager';

export interface ControlBarProps {
  isHost?: boolean;
  isSharing?: boolean;
  isSupported?: boolean;
  isMicMuted?: boolean;
  micVolume?: number;
  isSystemAudioMuted?: boolean;
  systemAudioVolume?: number;
  hasSystemAudio?: boolean;
  isCameraOn?: boolean;
  audioInputs?: MediaDeviceInfo[];
  videoInputs?: MediaDeviceInfo[];
  activeMicId?: string | null;
  activeCameraId?: string | null;
  preset?: ResolutionPreset;
  onToggleScreenShare?: () => void;
  onToggleMic?: () => void;
  onSetMicVolume?: (volume: number) => void;
  onToggleSystemAudioMute?: () => void;
  onSetSystemAudioVolume?: (volume: number) => void;
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
  micVolume = 100,
  isSystemAudioMuted = false,
  systemAudioVolume = 100,
  hasSystemAudio = false,
  isCameraOn = false,
  audioInputs = [],
  videoInputs = [],
  activeMicId = null,
  activeCameraId = null,
  preset = '480p',
  onToggleScreenShare,
  onToggleMic,
  onSetMicVolume,
  onToggleSystemAudioMute,
  onSetSystemAudioVolume,
  onToggleCamera,
  onSwitchMic,
  onSwitchCamera,
  onChangeResolution,
}) => {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
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

  const toggleFullscreen = async () => {
    const videoContainer = document.getElementById('video-container') || document.documentElement;
    if (!isCurrentlyFullscreen()) {
      await requestElementFullscreen(videoContainer);
      setIsFullscreen(true);
    } else {
      await exitElementFullscreen();
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
        {/* Microphone & Audio Sources Control Menu */}
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
              setIsAudioMenuOpen(!isAudioMenuOpen);
              setIsCameraMenuOpen(false);
            }}
            aria-label="Audio controls and settings"
            className={`p-2.5 rounded-r-full border-l border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500 ${
              isMicMuted ? 'bg-rose-900/40 text-rose-300' : 'bg-slate-900/90'
            }`}
          >
            <ChevronUp size={14} />
          </button>

          {/* Audio Controls Popover */}
          {isAudioMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-80 glass rounded-2xl border border-slate-800 p-3.5 space-y-4 z-50 shadow-2xl backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sliders size={14} className="text-brand-400" />
                  Audio Source Controls
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Independent Gain</span>
              </div>

              {/* 🎤 Microphone Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Mic size={14} className={isMicMuted ? 'text-rose-400' : 'text-emerald-400'} />
                    Microphone
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-8 text-right">{micVolume}%</span>
                    <button
                      type="button"
                      onClick={onToggleMic}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                        isMicMuted
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isMicMuted ? 'Unmute' : 'Mute'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <VolumeX size={12} className="text-slate-500 shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={micVolume}
                    onChange={(e) => onSetMicVolume?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 accent-brand-500 rounded-lg appearance-none cursor-pointer"
                    aria-label="Microphone volume"
                  />
                  <Volume2 size={12} className="text-slate-400 shrink-0" />
                </div>

                {/* Device Selector */}
                {audioInputs.length > 0 && (
                  <div className="pt-1">
                    <label className="text-[10px] font-medium text-slate-400 block mb-1">Input Device</label>
                    <select
                      value={activeMicId || ''}
                      onChange={(e) => onSwitchMic?.(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
                    >
                      {audioInputs.map((device, idx) => (
                        <option key={device.deviceId || idx} value={device.deviceId}>
                          {device.label || `Microphone ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 🔊 System Audio Section */}
              <div className="border-t border-slate-800/80 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Volume2 size={14} className={isSystemAudioMuted ? 'text-rose-400' : 'text-brand-400'} />
                    System / Device Audio
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-8 text-right">{systemAudioVolume}%</span>
                    <button
                      type="button"
                      onClick={onToggleSystemAudioMute}
                      disabled={!hasSystemAudio}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSystemAudioMuted
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isSystemAudioMuted ? 'Unmute' : 'Mute'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <VolumeX size={12} className="text-slate-500 shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={systemAudioVolume}
                    disabled={!hasSystemAudio}
                    onChange={(e) => onSetSystemAudioVolume?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 accent-brand-500 rounded-lg appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="System audio volume"
                  />
                  <Volume2 size={12} className="text-slate-400 shrink-0" />
                </div>

                {/* System Audio Status Badge */}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-slate-400 font-medium">Capture Status:</span>
                  {hasSystemAudio ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active (Screen Sound)
                    </span>
                  ) : (
                    <span className="text-amber-400/90 font-medium">
                      {isSharing ? 'Not Captured (No Tab Audio)' : 'Share Screen with Audio'}
                    </span>
                  )}
                </div>
              </div>
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
              setIsAudioMenuOpen(false);
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
