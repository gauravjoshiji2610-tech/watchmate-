import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Shield, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const Hero: React.FC = () => {
  return (
    <div className="text-center max-w-3xl mx-auto space-y-6 pt-6 pb-2">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center gap-2"
      >
        <Badge variant="brand">
          <Sparkles size={12} />
          WatchMate v1.0
        </Badge>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white"
      >
        Screen sharing with{' '}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400">
          zero friction.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto"
      >
        Instant 1-to-1 WebRTC screen sharing. Crisp audio, crystal-clear 1080p video,
        low latency, and persistent 20-second session recovery.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-2"
      >
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="text-amber-400" />
          <span>Sub-100ms Latency</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-emerald-400" />
          <span>Peer-to-Peer Encrypted</span>
        </div>
      </motion.div>
    </div>
  );
};
