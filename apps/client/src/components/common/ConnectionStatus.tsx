import React from 'react';
import type { WebRTCConnectionState } from '@/services/webrtc/ConnectionState';
import { cn } from '@/lib/utils';

export interface ConnectionStatusProps {
  state: WebRTCConnectionState;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state }) => {
  const config = {
    new: {
      color: 'bg-slate-500',
      glow: '',
      label: 'Peer New',
    },
    connecting: {
      color: 'bg-amber-400 animate-pulse',
      glow: 'shadow-[0_0_12px_rgba(251,191,36,0.6)]',
      label: 'Peer Negotiating',
    },
    connected: {
      color: 'bg-emerald-400',
      glow: 'shadow-[0_0_12px_rgba(52,211,153,0.6)]',
      label: 'Peer Connected (P2P)',
    },
    reconnecting: {
      color: 'bg-amber-400 animate-pulse',
      glow: 'shadow-[0_0_12px_rgba(251,191,36,0.6)]',
      label: 'Peer Reconnecting',
    },
    disconnected: {
      color: 'bg-orange-500',
      glow: '',
      label: 'Peer Disconnected',
    },
    failed: {
      color: 'bg-rose-500',
      glow: 'shadow-[0_0_12px_rgba(244,63,94,0.6)]',
      label: 'Peer Failed',
    },
    closed: {
      color: 'bg-slate-600',
      glow: '',
      label: 'Peer Closed',
    },
  };

  const current = config[state] ?? config.new;

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs font-mono text-slate-300 select-none">
      <span className={cn('h-2 w-2 rounded-full', current.color, current.glow)} />
      <span>{current.label}</span>
    </div>
  );
};
