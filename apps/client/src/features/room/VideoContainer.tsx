import React from 'react';
import { Monitor, User } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface VideoContainerProps {
  isHost?: boolean;
}

export const VideoContainer: React.FC<VideoContainerProps> = ({ isHost = false }) => {
  return (
    <div className="relative flex-1 w-full h-full bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center min-h-[300px] shadow-2xl">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/10 via-transparent to-slate-950 pointer-events-none" />

      {/* Video Placeholder Area */}
      <div className="flex flex-col items-center gap-4 text-center z-10 p-6 max-w-md">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-brand-400 shadow-xl shadow-brand-500/5">
          <Monitor size={48} className="animate-pulse-subtle" />
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white">
            {isHost ? 'Ready to share your screen' : 'Waiting for host screen share'}
          </h3>
          <p className="text-xs text-slate-400">
            {isHost
              ? 'Click "Share Screen" in the bottom controls to begin broadcasting'
              : 'The video stream will appear here automatically when the host shares'}
          </p>
        </div>

        <Badge variant="brand" className="mt-2">
          WebRTC P2P Direct Channel
        </Badge>
      </div>

      {/* Stats Overlay (Top-Left) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono text-slate-300">
          1080p • 60 FPS
        </span>
        <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono text-emerald-400">
          0ms (UI Prototype)
        </span>
      </div>

      {/* Participant Counter (Top-Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] text-slate-300">
        <User size={12} className="text-brand-400" />
        <span>1 / 2 Participants</span>
      </div>
    </div>
  );
};
