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
      // Get participants
      const { data: participantsData } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId);
      
      setParticipants(participantsData || []);

      // Get profiles
      if (participantsData?.length) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', participantsData.map(p => p.user_id));
        
        const profilesMap = Object.fromEntries(
          (profilesData || []).map(p => [p.id, p])
        );
        setProfiles(profilesMap);
      }
    };

    fetchData();
    
    // Subscribe to changes
    const participantsSubscription = supabase
      .channel('room_participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants' }, fetchData)
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