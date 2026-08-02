import { useState, useEffect } from 'react';

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

export function useConnectionStore() {
  const [status, setStatus] = useState<ConnectionState>('connected');

  useEffect(() => {
    const handleOnline = () => setStatus('connected');
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { status, setStatus };
}
