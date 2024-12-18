import { useEffect, useState } from 'react';
import { Icons } from '../ui/icons';
import { supabase } from '../../lib/supabase';

interface Participant {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  focus_goal: string;
  preferred_focus_time: string;
  is_speaking?: boolean;
  is_video_on?: boolean;
  is_audio_on?: boolean;
  current_focus_task?: string;
}

export function ParticipantsList({ roomId }: { roomId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // In a real app, you'd fetch participants for this specific room
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .limit(5); // For demo purposes

        if (error) throw error;

        // Transform profiles into participants with additional states
        const enhancedParticipants = data.map(profile => ({
          ...profile,
          is_speaking: false,
          is_video_on: true,
          is_audio_on: true,
          current_focus_task: `Working on ${profile.focus_goal}h focus goal`, // Placeholder
        }));

        setParticipants(enhancedParticipants);
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipants();
  }, [roomId]);

  return (
    <div className="w-[380px] bg-[#0c1220] border-l border-white/[0.08] p-8 pt-24">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-medium text-white/90">Participants</h2>
        <span className="text-sm text-white/40">
          {participants.length} of {participants.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icons.spinner className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="grid gap-3">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="p-3.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400/80 to-blue-500/80">
                    {participant.avatar_url ? (
                      <img
                        src={participant.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icons.user className="h-5 w-5 text-white/40" />
                      </div>
                    )}
                  </div>
                  {participant.is_speaking && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#0c1220]" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white/90 text-sm truncate">
                      {participant.full_name}
                    </h3>
                    <div className="flex gap-1">
                      {!participant.is_video_on && (
                        <Icons.videoOff className="h-3 w-3 text-red-400" />
                      )}
                      {!participant.is_audio_on && (
                        <Icons.micOff className="h-3 w-3 text-red-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-white/50">
                    {participant.preferred_focus_time === 'morning' ? 'Morning Person' : 'Night Owl'}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 pl-[52px]">
                <p className="text-xs text-white/70">
                  {participant.current_focus_task}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Icons.target className="h-3 w-3 text-emerald-500/70" />
                  <span className="text-xs text-white/40">
                    {participant.focus_goal}h daily goal
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 