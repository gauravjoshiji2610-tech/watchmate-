import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/60 bg-slate-950/60 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">AntiGravity v0.1.0</span>
          <span>•</span>
          <span>Lightweight 1-to-1 Screen Sharing</span>
        </div>

        <div className="flex items-center gap-6">
          <span>End-to-End P2P Signaling</span>
          <span>Redis State Engine</span>
          <span>Zero Server Storage</span>
        </div>
      </div>
    </footer>
  );
};
