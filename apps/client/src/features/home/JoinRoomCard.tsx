import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { LogIn, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRecentRoomsStore } from '@/stores/recentRoomsStore';

const schema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(30, 'Display name must not exceed 30 characters')
    .trim(),
  roomId: z
    .string()
    .min(1, 'Room ID is required')
    .max(50, 'Invalid room ID length')
    .trim(),
});

type FormValues = z.infer<typeof schema>;

export const JoinRoomCard: React.FC = () => {
  const navigate = useNavigate();
  const { addRecentRoom } = useRecentRoomsStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      roomId: '',
    },
  });

  const onSubmit = (data: FormValues) => {
    const cleanRoomId = data.roomId.trim();

    addRecentRoom({
      roomId: cleanRoomId,
      name: `Room ${cleanRoomId.slice(0, 8)}`,
      role: 'viewer',
    });

    toast.info('Joining room...', {
      description: `Connecting as ${data.displayName}`,
    });

    navigate(`/room/${cleanRoomId}`, {
      state: { displayName: data.displayName, isHost: false },
    });
  };

  return (
    <Card className="flex flex-col justify-between h-full border-slate-800 hover:border-slate-700 transition-colors">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <LogIn size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Join a Room</h2>
            <p className="text-xs text-slate-400">View an existing screen share</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Input
            label="Your Display Name"
            placeholder="e.g. Sam"
            error={errors.displayName?.message}
            {...register('displayName')}
          />

          <Input
            label="Room ID or Link"
            placeholder="Paste room ID..."
            error={errors.roomId?.message}
            {...register('roomId')}
          />

          <Button type="submit" variant="secondary" className="w-full gap-2" isLoading={isSubmitting}>
            <span>Join Stream</span>
            <ArrowRight size={16} />
          </Button>
        </form>
      </div>
    </Card>
  );
};
