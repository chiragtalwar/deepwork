import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from './useUser';

interface RoomPresence {
  isConnected: boolean;
  error: string | null;
}

export function useRoomPresence(roomId: string) {
  const { user } = useUser();
  const [presence, setPresence] = useState<RoomPresence>({
    isConnected: false,
    error: null
  });

  useEffect(() => {
    if (!user?.id || !roomId) return;

    const setupPresence = async () => {
      try {
        // Add user to room_participants
        const { error: insertError } = await supabase
          .from('room_participants')
          .insert([
            {
              room_id: roomId,
              user_id: user.id,
              joined_at: new Date().toISOString()
            }
          ]);

        if (insertError) throw insertError;
        setPresence({ isConnected: true, error: null });

      } catch (err) {
        console.error('Error setting up room presence:', err);
        setPresence({ isConnected: false, error: 'Failed to join room' });
      }
    };

    setupPresence();

    // Cleanup: Remove user from room_participants
    return () => {
      const cleanup = async () => {
        try {
          const { error: deleteError } = await supabase
            .from('room_participants')
            .delete()
            .match({ room_id: roomId, user_id: user.id });

          if (deleteError) throw deleteError;
        } catch (err) {
          console.error('Error cleaning up room presence:', err);
        }
      };
      cleanup();
    };
  }, [roomId, user?.id]);

  return presence;
}
