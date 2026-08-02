import React from 'react';
import { Hero } from '@/features/home/Hero';
import { CreateRoomCard } from '@/features/home/CreateRoomCard';
import { JoinRoomCard } from '@/features/home/JoinRoomCard';
import { RecentRooms } from '@/features/home/RecentRooms';
import { FeaturesGrid } from '@/features/home/FeaturesGrid';
import { BrowserCompat } from '@/features/home/BrowserCompat';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-10 pb-8">
      {/* Hero Section */}
      <Hero />

      {/* Action Cards: Create vs Join */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <CreateRoomCard />
        <JoinRoomCard />
      </div>

      {/* Recent Rooms (from localStorage) */}
      <div className="max-w-4xl mx-auto">
        <RecentRooms />
      </div>

      {/* Features Grid */}
      <FeaturesGrid />

      {/* Browser & Device Compatibility Matrix */}
      <BrowserCompat />
    </div>
  );
};
