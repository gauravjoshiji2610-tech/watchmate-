import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass p-8 rounded-2xl text-center space-y-6">
        <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 w-fit mx-auto">
          <FileQuestion size={48} />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white">404 — Page Not Found</h1>
          <p className="text-sm text-slate-400">
            The room or page you are looking for does not exist or has expired.
          </p>
        </div>

        <Button onClick={() => navigate('/')} className="w-full gap-2">
          <Home size={16} />
          <span>Return Home</span>
        </Button>
      </div>
    </div>
  );
};
