import { useEffect, useState } from 'react';
import { useUser } from './useUser';
import { supabase } from '@/lib/supabase';

export function useRoomPresence(roomId: string) {
  const { user } = useUser();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !roomId) return;

    const addUserToRoom = async () => {
      try {
        console.log('[PRESENCE] Adding user to room:', { userId: user.id, roomId });
        
        const { error: insertError } = await supabase
          .from('room_participants')
          .upsert({
            room_id: roomId,
            user_id: user.id,
            joined_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[PRESENCE] Error adding user to room:', insertError);
          setError('Failed to join room');
          return;
        }

        console.log('[PRESENCE] Successfully added user to room');
      } catch (err) {
        console.error('[PRESENCE] Error in addUserToRoom:', err);
        setError('Failed to join room');
      }
    };

    addUserToRoom();

    // Cleanup: Remove user from room when they leave
    return () => {
      const removeUserFromRoom = async () => {
        try {
          console.log('[PRESENCE] Removing user from room:', { userId: user.id, roomId });
          
          const { error: deleteError } = await supabase
            .from('room_participants')
            .delete()
            .match({
              room_id: roomId,
              user_id: user.id
            });

          if (deleteError) {
            console.error('[PRESENCE] Error removing user from room:', deleteError);
          } else {
            console.log('[PRESENCE] Successfully removed user from room');
          }
        } catch (err) {
          console.error('[PRESENCE] Error in removeUserFromRoom:', err);
        }
      };

      removeUserFromRoom();
    };
  }, [roomId, user?.id]);

  return { error };
}
