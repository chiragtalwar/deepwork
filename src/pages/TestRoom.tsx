import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { TestVideoRoom } from '@/components/room/TestVideoRoom';

interface Participant {
  user_id: string;
  joined_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export default function TestRoom() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const { roomId = 'test-room' } = useParams(); // Default roomId for testing

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', roomId);
        
        if (participantsError) {
          console.error('[ROOM] Error fetching participants:', participantsError);
          return;
        }
        
        console.log('[ROOM] Fetched participants:', participantsData);
        setParticipants(participantsData || []);

        // Get profiles
        if (participantsData?.length) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', participantsData.map(p => p.user_id));
          
          if (profilesError) {
            console.error('[ROOM] Error fetching profiles:', profilesError);
            return;
          }

          console.log('[ROOM] Fetched profiles:', profilesData);
          const profilesMap = Object.fromEntries(
            (profilesData || []).map(p => [p.id, p])
          );
          setProfiles(profilesMap);
        }
      } catch (err) {
        console.error('[ROOM] Error in fetchData:', err);
      }
    };

    fetchData();
    
    // Subscribe to changes
    const participantsSubscription = supabase
      .channel(`room_participants:${roomId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`
      }, fetchData)
      .subscribe();

    return () => {
      participantsSubscription.unsubscribe();
    };
  }, [roomId]);

  return (
    <TestVideoRoom
      roomId={roomId}
      participants={participants}
      profiles={profiles}
    />
  );
} 