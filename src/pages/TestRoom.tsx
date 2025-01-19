import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { TestVideoRoom } from '@/components/room/TestVideoRoom';
import { useUserStats } from '@/hooks/useUserStats';

interface Participant {
  user_id: string;
  joined_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

// Use a fixed UUID for the test room
const TEST_ROOM_ID = '123e4567-e89b-12d3-a456-426614174000';

export default function TestRoom() {
  const { roomId } = useParams();
  const [participants, setParticipants] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  
  // Get user IDs for stats
  const userIds = participants.map(p => p.user_id);
  const { stats: userStats } = useUserStats(userIds);

  useEffect(() => {
    // Always use TEST_ROOM_ID for consistency
    const actualRoomId = TEST_ROOM_ID;

    // Fetch initial participants data
    const fetchInitialData = async () => {
      console.log('[ROOM] Fetching participants for room:', actualRoomId);
      const { data: initialParticipants, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', actualRoomId);

      if (error) {
        console.error('[ROOM] Error fetching participants:', error);
        return;
      }

      if (initialParticipants) {
        console.log('[ROOM] Initial participants:', initialParticipants);
        setParticipants(initialParticipants);
        
        if (initialParticipants.length > 0) {
          // Fetch profiles for initial participants
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, bio')
            .in('id', initialParticipants.map(p => p.user_id));

          if (profilesError) {
            console.error('[ROOM] Error fetching profiles:', profilesError);
            return;
          }

          if (profiles) {
            console.log('[ROOM] Initial profiles:', profiles);
            const profileMap = profiles.reduce((acc, profile) => ({
              ...acc,
              [profile.id]: profile
            }), {});
            setProfiles(profileMap);
          }
        }
      }
    };

    fetchInitialData();

    // Subscribe to room_participants changes
    const subscription = supabase
      .channel(`room_participants:${actualRoomId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'room_participants',
          filter: `room_id=eq.${actualRoomId}`
        }, 
        async (payload) => {
          console.log('[ROOM] Participant change:', payload);
          
          // Fetch updated participants
          const { data: participants, error } = await supabase
            .from('room_participants')
            .select('*')
            .eq('room_id', actualRoomId);

          if (error) {
            console.error('[ROOM] Error fetching updated participants:', error);
            return;
          }

          if (participants) {
            console.log('[ROOM] Updated participants:', participants);
            setParticipants(participants);
            
            if (participants.length > 0) {
              // Fetch profiles for all participants
              const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, bio')
                .in('id', participants.map(p => p.user_id));

              if (profilesError) {
                console.error('[ROOM] Error fetching updated profiles:', profilesError);
                return;
              }

              if (profiles) {
                console.log('[ROOM] Updated profiles:', profiles);
                const profileMap = profiles.reduce((acc, profile) => ({
                  ...acc,
                  [profile.id]: profile
                }), {});
                setProfiles(profileMap);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);  // Remove roomId dependency since we're using TEST_ROOM_ID

  return (
    <TestVideoRoom
    //   roomId={TEST_ROOM_ID}
    //   participants={participants}
    //   profiles={profiles}
    //   userStats={userStats}
    />
  );
} 