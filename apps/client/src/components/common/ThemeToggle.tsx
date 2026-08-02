import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-label="Light mode"
        className={`p-1.5 rounded-lg transition-colors ${
          theme === 'light' ? 'bg-slate-800 text-brand-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Sun size={14} />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-label="Dark mode"
        className={`p-1.5 rounded-lg transition-colors ${
          theme === 'dark' ? 'bg-slate-800 text-brand-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Moon size={14} />
      </button>
      <button
        type="button"
        onClick={() => setTheme('system')}
        aria-label="System theme"
        className={`p-1.5 rounded-lg transition-colors ${
          theme === 'system' ? 'bg-slate-800 text-brand-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Laptop size={14} />
      </button>
    </div>
  );
};
