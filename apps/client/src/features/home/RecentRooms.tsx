import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trash2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRecentRoomsStore } from '@/stores/recentRoomsStore';

export const RecentRooms: React.FC = () => {
  const navigate = useNavigate();
  const { recentRooms, clearRecentRooms } = useRecentRoomsStore();

  if (recentRooms.length === 0) {
    return null;
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
          <Clock size={16} className="text-brand-400" />
          <span>Recent Rooms (Last 5)</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRecentRooms}
          className="text-xs text-slate-500 hover:text-rose-400 gap-1"
        >
          <Trash2 size={12} />
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {recentRooms.map((room) => (
          <div
            key={room.roomId}
            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-brand-500/40 transition-all group flex items-center justify-between"
          >
            <div className="flex flex-col min-w-0 pr-2">
              <span className="font-semibold text-sm text-slate-200 truncate">
                {room.name}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={room.role === 'host' ? 'brand' : 'neutral'}>
                  {room.role}
                </Badge>
                <span className="text-[10px] text-slate-500 font-mono truncate">
                  {room.roomId.slice(0, 10)}...
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/room/${room.roomId}`)}
              className="p-2 text-slate-400 group-hover:text-brand-400 group-hover:bg-brand-500/10"
              aria-label={`Rejoin ${room.name}`}
            >
              <ExternalLink size={16} />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
