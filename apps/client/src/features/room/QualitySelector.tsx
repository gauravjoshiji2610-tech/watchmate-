import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

export type Quality = '1080p' | '720p' | '480p';

export const QualitySelector: React.FC = () => {
  const [quality, setQuality] = useState<Quality>('1080p');
  const [isOpen, setIsOpen] = useState(false);

  const selectQuality = (q: Quality) => {
    setQuality(q);
    setIsOpen(false);
    toast.info(`Stream quality set to ${q}`);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
      >
        <Settings size={14} />
        <span>{quality}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-32 glass rounded-xl border border-slate-800 p-1 space-y-0.5 z-50 shadow-2xl">
          {(['1080p', '720p', '480p'] as Quality[]).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => selectQuality(q)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                quality === q ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {q} {q === '1080p' ? '(Full HD)' : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
