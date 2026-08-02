import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Video, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRecentRoomsStore } from '@/stores/recentRoomsStore';
import { generateRoomId } from '@antigravity/shared-utils';

const schema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(30, 'Display name must not exceed 30 characters')
    .trim(),
});

type FormValues = z.infer<typeof schema>;

export const CreateRoomCard: React.FC = () => {
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
    },
  });

  const onSubmit = (data: FormValues) => {
    // Generate a client-side placeholder room ID for navigation
    const roomId = generateRoomId();
    addRecentRoom({
      roomId,
      name: `${data.displayName}'s Room`,
      role: 'host',
    });

    toast.success('Room created successfully!', {
      description: `Navigating to room ${roomId.slice(0, 8)}...`,
    });

    navigate(`/room/${roomId}`, {
      state: { displayName: data.displayName, isHost: true },
    });
  };

  return (
    <Card className="flex flex-col justify-between h-full border-brand-500/20 hover:border-brand-500/40 transition-colors">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/30">
            <Video size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Create a Room</h2>
            <p className="text-xs text-slate-400">Host a screen share session</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Input
            label="Your Display Name"
            placeholder="e.g. Alex"
            error={errors.displayName?.message}
            {...register('displayName')}
          />

          <Button type="submit" className="w-full gap-2" isLoading={isSubmitting}>
            <span>Create & Share Screen</span>
            <ArrowRight size={16} />
          </Button>
        </form>
      </div>
    </Card>
  );
};
