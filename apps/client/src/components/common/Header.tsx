import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { StatusIndicator } from './StatusIndicator';
import { ThemeToggle } from './ThemeToggle';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-brand-600/30 group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              AntiGravity
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-widest text-brand-400 -mt-1">
              Screen Share
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <StatusIndicator />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
