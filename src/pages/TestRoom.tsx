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

// Use a fixed UUID for the test room
const TEST_ROOM_ID = '123e4567-e89b-12d3-a456-426614174000';

export default function TestRoom() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const { roomId } = useParams(); 
  
  // Use the provided roomId if it's a valid UUID, otherwise use TEST_ROOM_ID
  const actualRoomId = roomId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    ? roomId
    : TEST_ROOM_ID;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', actualRoomId);
        
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
      .channel(`room_participants:${actualRoomId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'room_participants',
        filter: `room_id=eq.${actualRoomId}`
      }, fetchData)
      .subscribe();

    return () => {
      participantsSubscription.unsubscribe();
    };
  }, [actualRoomId]);

  return (
    <TestVideoRoom
      roomId={actualRoomId}
      participants={participants}
      profiles={profiles}
    />
  );
} 