import React from 'react';
import { Shield, Zap, RefreshCw, MessageSquare, Monitor, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const features = [
  {
    icon: Zap,
    title: 'Ultra Low Latency',
    description: 'Sub-100ms real-time screen streaming via WebRTC P2P direct socket channels.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: Shield,
    title: 'Strict 1-to-1 Privacy',
    description: 'Enforced participant limit (max 2 per room). Zero third-party viewer eavesdropping.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: RefreshCw,
    title: '20-Second Auto Reconnect',
    description: 'Transient drop protection. Restores role, session, and host lock seamlessly on reconnect.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Room-Scoped Chat',
    description: 'Rate-limited, Zod-validated chat with last 50 messages history buffer per room in Redis.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: Monitor,
    title: '1080p Crystal Clear',
    description: 'Full HD screen resolution with high frame rate and dynamic audio track synchronization.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    icon: Lock,
    title: 'Token Identity',
    description: 'Cryptographically safe nanoid tokens bound to room state in Redis. Zero password clutter.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
  },
];

export const FeaturesGrid: React.FC = () => {
  return (
    <div className="space-y-6 pt-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Engineered for performance
        </h2>
        <p className="text-sm text-slate-400">
          Clean architecture built with Discord, Linear, and Apple design aesthetics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Card key={idx} className="space-y-3 hover:scale-[1.02] transition-transform duration-200">
              <div className={`p-2.5 rounded-xl w-fit border ${item.bg} ${item.color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-base text-slate-100">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
