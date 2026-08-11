import React, { useRef, useEffect } from 'react';
import { Monitor, User, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { logger } from '@/lib/logger';
import type { WebRTCStatsReport } from '@/services/webrtc/WebRTCStatsMonitor';

export interface VideoContainerProps {
  stream?: MediaStream | null;
  isLocal?: boolean;
  isHost?: boolean;
  isSupported?: boolean;
  error?: Error | null;
  stats?: WebRTCStatsReport | null;
}

export const VideoContainer: React.FC<VideoContainerProps> = ({
  stream = null,
  isLocal = false,
  isHost = false,
  isSupported = true,
  error = null,
  stats = null,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      if (stream) {
        logger.info('[VideoContainer Diagnostic] Attaching stream to HTML video element', {
          isLocal,
          trackCount: stream.getTracks().length,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
        });

        videoEl.srcObject = stream;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('webkit-playsinline', 'true');

        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((err: unknown) => {
            logger.warn('[VideoContainer Diagnostic] Video play() rejected by mobile browser autoplay policy', { err });
            // For remote streams, if unmuted playback is blocked by mobile autoplay policy, fallback attempt
            if (!isLocal) {
              videoEl.muted = false;
              videoEl.play().catch(() => {
                /* user interaction will trigger playback */
              });
            }
          });
        }
      } else {
        videoEl.srcObject = null;
      }
    }
    return () => {
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, [stream, isLocal]);

  return (
    <div
      id="video-container"
      className="relative flex-1 w-full h-full bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center min-h-[300px] shadow-2xl"
    >
      {/* Active Video Element */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-contain bg-black"
        />
      ) : !isSupported && isHost ? (
        /* Unsupported Browser Banner (e.g. iOS Safari Host) */
        <div className="flex flex-col items-center gap-4 text-center z-10 p-6 max-w-md">
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-xl">
            <ShieldAlert size={48} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-white">Browser Unsupported for Hosting</h3>
            <p className="text-xs text-amber-300/80">
              iOS Safari and mobile browsers do not support screen broadcast. You can join as a Viewer from mobile, or open WatchMate on Desktop Chrome/Edge to share your screen.
            </p>
          </div>
          <Badge variant="warning" className="mt-2">
            Viewer Mode Only
          </Badge>
        </div>
      ) : error ? (
        /* Permission Denied or Media Error Banner */
        <div className="flex flex-col items-center gap-4 text-center z-10 p-6 max-w-md">
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-xl">
            <AlertTriangle size={48} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-white">Screen Share Error</h3>
            <p className="text-xs text-rose-300/80">{error.message}</p>
          </div>
          <Badge variant="danger" className="mt-2">
            {error.name || 'Permission Denied'}
          </Badge>
        </div>
      ) : (
        /* Waiting / Ready Placeholder */
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
      )}

      {/* Live WebRTC Telemetry Stats Overlay (Top-Left) */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {stats ? (
          <>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono text-slate-300">
              <Activity size={12} className="text-brand-400" />
              <span>
                {stats.bitrateKbps >= 1000
                  ? `${(stats.bitrateKbps / 1000).toFixed(1)} Mbps`
                  : `${stats.bitrateKbps} kbps`}{' '}
                • {stats.fps} FPS
              </span>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono text-slate-300">
              RTT: {stats.rttMs}ms
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono uppercase text-emerald-400">
              {stats.candidateType === 'relay' ? 'TURN Relay' : 'P2P STUN'}
            </span>
          </>
        ) : (
          <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono text-slate-400">
            WebRTC Telemetry Ready
          </span>
        )}
      </div>

      {/* Participant Counter (Top-Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800/80 backdrop-blur-md text-[11px] text-slate-300">
        <User size={12} className="text-brand-400" />
        <span>1 / 2 Participants</span>
      </div>
    </div>
  );
};
