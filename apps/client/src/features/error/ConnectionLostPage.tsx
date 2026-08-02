import React from 'react';
import { SignalLow, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const ConnectionLostPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-white">
      <div className="max-w-md w-full glass p-8 rounded-2xl text-center space-y-6">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 w-fit mx-auto animate-pulse">
          <SignalLow size={48} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Connection Lost</h1>
          <p className="text-sm text-slate-400">
            Reconnecting to the AntiGravity signaling server... 20-second session grace period is active.
          </p>
        </div>

        <Button onClick={() => window.location.reload()} className="w-full gap-2">
          <RefreshCw size={16} />
          <span>Reconnect Now</span>
        </Button>
      </div>
    </div>
  );
};
