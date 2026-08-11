import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { StatusIndicator } from '@/components/common/StatusIndicator';
import { ConnectionStatus } from '@/components/common/ConnectionStatus';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Badge } from '@/components/ui/Badge';
import type { WebRTCConnectionState } from '@/services/webrtc/ConnectionState';

export interface TopBarProps {
  roomId: string;
  isHost?: boolean;
  webRTCState?: WebRTCConnectionState;
}

export const TopBar: React.FC<TopBarProps> = ({
  roomId,
  isHost = false,
  webRTCState = 'new',
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast.success('Room ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-16 w-full glass border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-brand-600/30">
            <ShieldCheck size={18} />
          </div>
          <span className="font-bold text-base text-white tracking-tight hidden sm:inline">
            WatchMate
          </span>
        </Link>

        <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />

        <div className="flex items-center gap-2">
          <Badge variant={isHost ? 'brand' : 'neutral'}>
            {isHost ? 'Host' : 'Viewer'}
          </Badge>

          <button
            type="button"
            onClick={copyRoomId}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            <span>{roomId.slice(0, 10)}...</span>
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ConnectionStatus state={webRTCState} />
        <StatusIndicator />
        <ThemeToggle />
      </div>
    </header>
  );
};
