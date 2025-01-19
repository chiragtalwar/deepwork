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
            console.log('Room participants change detected:', payload);
            
            // Fetch all current participants
            const { data: participants, error: fetchError } = await supabase
              .from('room_participants')
              .select('*')
              .eq('room_id', roomId);

            if (fetchError) {
              console.error('Error fetching participants:', fetchError);
              return;
            }

            if (participants) {
              console.log('Updated participants list:', participants);
              setParticipants(participants);
              
              // Fetch profiles for all participants
              const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', participants.map(p => p.user_id));

              if (profileError) {
                console.error('Error fetching profiles:', profileError);
                return;
              }

              if (profiles) {
                const profileMap = profiles.reduce((acc, profile) => {
                  acc[profile.id] = profile;
                  return acc;
                }, {} as { [key: string]: Profile });
                
                console.log('Updated profiles map:', profileMap);
                setProfiles(profileMap);
              }
            }
          })
          .subscribe((status) => {
            console.log('Presence channel subscription status:', status);
          });

        // Initial fetch with error handling
        const { data: initialParticipants, error: initialError } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', roomId);

        if (initialError) {
          console.error('Error fetching initial participants:', initialError);
          setError('Failed to fetch initial participants');
          return;
        }

        if (initialParticipants) {
          console.log('Initial participants:', initialParticipants);
          setParticipants(initialParticipants);
          
          const { data: initialProfiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', initialParticipants.map(p => p.user_id));

          if (profileError) {
            console.error('Error fetching initial profiles:', profileError);
            setError('Failed to fetch initial profiles');
            return;
          }

          if (initialProfiles) {
            const profileMap = initialProfiles.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as { [key: string]: Profile });
            
            console.log('Initial profiles map:', profileMap);
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
      if (presenceChannel) {
        presenceChannel.unsubscribe();
      }
      
      // Always remove user from room when unmounting
      supabase
        .from('room_participants')
        .delete()
        .match({ room_id: roomId, user_id: userId })
        .then(({ error }) => {
          if (error) {
            console.error('Error removing participant:', error);
          }
        });
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