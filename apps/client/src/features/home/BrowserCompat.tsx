import React from 'react';
import { Chrome, Compass, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const browsers = [
  { name: 'Google Chrome', icon: Chrome, host: true, viewer: true, status: 'Full Support' },
  { name: 'Mozilla Firefox', icon: Compass, host: true, viewer: true, status: 'Full Support' },
  { name: 'Microsoft Edge', icon: Chrome, host: true, viewer: true, status: 'Full Support' },
  { name: 'Apple Safari (macOS)', icon: Compass, host: true, viewer: true, status: 'Full Support' },
  { name: 'iOS Safari (iPhone/iPad)', icon: Compass, host: false, viewer: true, status: 'Viewer Only' },
];

export const BrowserCompat: React.FC = () => {
  return (
    <Card className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-white">Browser & Device Compatibility</h3>
          <p className="text-xs text-slate-400">WebRTC Screen Capture & Video Playback Matrix</p>
        </div>
        <Badge variant="brand">Zero Plugins Required</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
        {browsers.map((b, idx) => {
          const Icon = b.icon;
          return (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2">
                <Icon size={18} className="text-brand-400" />
                <span className="text-xs font-semibold text-slate-200">{b.name}</span>
              </div>

              <div className="space-y-1 text-[11px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Host (Sharing):</span>
                  {b.host ? (
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 size={12} /> Yes
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-0.5 font-medium">
                      No (iOS limitation)
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Viewer (Watching):</span>
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 size={12} /> Yes
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong>iOS Safari Note:</strong> Apple iOS Safari does not support <code>getDisplayMedia()</code> for screen capture. iOS devices can watch screen streams as Viewers, but Host screen sharing requires macOS, Windows, Linux, or Android.
        </p>
      </div>
    </Card>
  );
};
