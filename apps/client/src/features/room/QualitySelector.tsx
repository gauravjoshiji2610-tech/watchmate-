import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import type { ResolutionPreset } from '@/services/media/CameraManager';

export interface QualitySelectorProps {
  currentPreset?: ResolutionPreset | undefined;
  onSelectPreset?: ((preset: ResolutionPreset) => void) | undefined;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  currentPreset = '480p',
  onSelectPreset,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectPreset = (p: ResolutionPreset) => {
    onSelectPreset?.(p);
    setIsOpen(false);
  };

  const options: { value: ResolutionPreset; label: string }[] = [
    { value: '480p', label: '480p (Default SD)' },
    { value: '720p', label: '720p (HD)' },
    { value: '1080p', label: '1080p (Full HD)' },
    { value: 'auto', label: 'Auto (Browser Default)' },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Select video resolution quality. Current: ${currentPreset}`}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-xs font-medium text-slate-300 hover:text-white transition-colors"
      >
        <Settings size={14} />
        <span className="uppercase font-mono">{currentPreset}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-44 glass rounded-xl border border-slate-800 p-1 space-y-0.5 z-50 shadow-2xl">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectPreset(opt.value)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:bg-slate-800 ${
                currentPreset === opt.value
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
