import React from 'react';
import { useConnectionStore } from '@/stores/connectionStore';
import { cn } from '@/lib/utils';

export const StatusIndicator: React.FC = () => {
  const { status } = useConnectionStore();

  const config = {
    connected: {
      color: 'bg-emerald-500',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.6)]',
      text: 'Connected',
    },
    reconnecting: {
      color: 'bg-amber-500 animate-pulse',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.6)]',
      text: 'Reconnecting',
    },
    offline: {
      color: 'bg-rose-500',
      glow: 'shadow-[0_0_12px_rgba(244,63,94,0.6)]',
      text: 'Offline',
    },
  };

  const current = config[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md text-xs font-medium text-slate-300 select-none">
      <span className={cn('h-2 w-2 rounded-full', current.color, current.glow)} />
      <span>{current.text}</span>
    </div>
  );
};
