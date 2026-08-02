import { useState } from 'react';

export interface RecentRoom {
  readonly roomId: string;
  readonly name: string;
  readonly role: 'host' | 'viewer';
  readonly joinedAt: number;
}

const RECENT_ROOMS_KEY = 'antigravity_recent_rooms';
const MAX_RECENT = 5;

export function getStoredRecentRooms(): RecentRoom[] {
  try {
    const raw = localStorage.getItem(RECENT_ROOMS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentRoom[];
  } catch {
    return [];
  }
}

export function useRecentRoomsStore() {
  const [recentRooms, setRecentRoomsState] = useState<RecentRoom[]>(getStoredRecentRooms);

  const addRecentRoom = (room: Omit<RecentRoom, 'joinedAt'>) => {
    const newEntry: RecentRoom = {
      ...room,
      joinedAt: Date.now(),
    };

    const filtered = recentRooms.filter((r) => r.roomId !== room.roomId);
    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT);

    setRecentRoomsState(updated);
    localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(updated));
  };

  const clearRecentRooms = () => {
    setRecentRoomsState([]);
    localStorage.removeItem(RECENT_ROOMS_KEY);
  };

  return { recentRooms, addRecentRoom, clearRecentRooms };
}
