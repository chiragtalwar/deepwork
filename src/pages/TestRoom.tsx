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
  const { roomId = 'test' } = useParams();
  const [participants, setParticipants] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  
  // Get user IDs for stats
  const userIds = participants.map(p => p.user_id);
  const { stats: userStats } = useUserStats(userIds);

  useEffect(() => {
    // Subscribe to room_participants changes
    const subscription = supabase
      .channel(`room_participants:${roomId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`
        }, 
        async (payload) => {
          // Fetch updated participants
          const { data: participants } = await supabase
            .from('room_participants')
            .select('*')
            .eq('room_id', roomId);

          if (participants) {
            setParticipants(participants);
            
            // Fetch profiles for all participants
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, bio')
              .in('id', participants.map(p => p.user_id));

            if (profiles) {
              const profileMap = profiles.reduce((acc, profile) => ({
                ...acc,
                [profile.id]: profile
              }), {});
              setProfiles(profileMap);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  return (
    <TestVideoRoom
      roomId={roomId}
      participants={participants}
      profiles={profiles}
      userStats={userStats}
    />
  );
} 