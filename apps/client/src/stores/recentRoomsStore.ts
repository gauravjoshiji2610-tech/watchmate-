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

    setRecentRoomsState((prev) => {
      const filtered = prev.filter((r) => r.roomId !== room.roomId);
      const updated = [newEntry, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(updated));
      } catch {
        // localStorage quota or security exception handling
      }
      return updated;
    });
  };

  const clearRecentRooms = () => {
    setRecentRoomsState([]);
    try {
      localStorage.removeItem(RECENT_ROOMS_KEY);
    } catch {
      // Ignore storage exception
    }
  };

  return { recentRooms, addRecentRoom, clearRecentRooms };
}
