import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const OfflinePage: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-white">
      <div className="max-w-md w-full glass p-8 rounded-2xl text-center space-y-6">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 w-fit mx-auto">
          <WifiOff size={48} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">You are offline</h1>
          <p className="text-sm text-slate-400">
            Please check your internet connection. AntiGravity requires an active network connection for WebRTC signaling and real-time screen sharing.
          </p>
        </div>

        <Button onClick={handleRetry} className="w-full gap-2">
          <RefreshCw size={16} />
          <span>Retry Connection</span>
        </Button>
      </div>
    </div>
  );
};
