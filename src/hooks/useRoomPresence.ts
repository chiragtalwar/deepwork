import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Participant {
  id: string;
  user_id: string;
  room_id: string;
  joined_at: string;
  status: 'focus' | 'break' | 'away';
  current_focus_task?: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  title?: string;
  bio?: string;
  deep_work_sessions?: number;
}

export function useRoomPresence(roomId: string, userId: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [profiles, setProfiles] = useState<{ [key: string]: Profile }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let presenceChannel: RealtimeChannel;

    const setupPresence = async () => {
      try {
        // First ensure room exists
        const { data: room } = await supabase
          .from('rooms')
          .select('id')
          .eq('id', roomId)
          .single();

        if (!room) {
          await supabase
            .from('rooms')
            .insert({
              id: roomId,
              name: 'Deep Work Room',
              max_participants: 5
            });
        }

        // Add current user to room
        await supabase
          .from('room_participants')
          .upsert({
            room_id: roomId,
            user_id: userId,
            joined_at: new Date().toISOString(),
            status: 'focus'
          }, {
            onConflict: 'room_id,user_id'
          });

        // Subscribe to presence changes
        presenceChannel = supabase
          .channel(`room:${roomId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'room_participants',
            filter: `room_id=eq.${roomId}`
          }, async (payload) => {
            // Fetch all current participants
            const { data: participants } = await supabase
              .from('room_participants')
              .select('*')
              .eq('room_id', roomId);

            if (participants) {
              setParticipants(participants);
              
              // Fetch profiles for all participants
              const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .in('id', participants.map(p => p.user_id));

              if (profiles) {
                const profileMap = profiles.reduce((acc, profile) => {
                  acc[profile.id] = profile;
                  return acc;
                }, {} as { [key: string]: Profile });
                
                setProfiles(profileMap);
              }
            }
          })
          .subscribe();

        // Initial fetch
        const { data: initialParticipants } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', roomId);

        if (initialParticipants) {
          setParticipants(initialParticipants);
          
          const { data: initialProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', initialParticipants.map(p => p.user_id));

          if (initialProfiles) {
            const profileMap = initialProfiles.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as { [key: string]: Profile });
            
            setProfiles(profileMap);
          }
        }
      } catch (error) {
        setError(`Failed to setup presence: ${error}`);
      }
    };

    setupPresence();

    // Cleanup
    return () => {
      const cleanup = async () => {
        if (presenceChannel) {
          await presenceChannel.unsubscribe();
        }
        
        try {
          // Always attempt to remove the user from room
          const { error } = await supabase
            .from('room_participants')
            .delete()
            .match({ room_id: roomId, user_id: userId });
            
          if (error) {
            console.error('Failed to cleanup room presence:', error);
          }
        } catch (err) {
          console.error('Error during room presence cleanup:', err);
        }
      };

      cleanup();
    };
  }, [roomId, userId]);

  const updateStatus = async (status: 'focus' | 'break' | 'away') => {
    try {
      await supabase
        .from('room_participants')
        .update({ status })
        .match({ room_id: roomId, user_id: userId });
    } catch (error) {
      setError(`Failed to update status: ${error}`);
    }
  };

  const updateCurrentTask = async (task: string) => {
    try {
      await supabase
        .from('room_participants')
        .update({ current_focus_task: task })
        .match({ room_id: roomId, user_id: userId });
    } catch (error) {
      setError(`Failed to update task: ${error}`);
    }
  };

  return {
    participants,
    profiles,
    error,
    updateStatus,
    updateCurrentTask
  };
} 