import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgoraRoom } from '@/hooks/useAgoraRoom';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { useUser } from '@/hooks/useUser';
import { Icons } from '@/components/ui/icons';

// Define our video slots
const VIDEO_SLOTS = [
  { id: 'video-slot-1', index: 1 },
  { id: 'video-slot-2', index: 2 },
  { id: 'video-slot-3', index: 3 },
  { id: 'video-slot-4', index: 4 },
  { id: 'video-slot-5', index: 5 },
];

interface TestVideoRoomProps {
  roomId: string;
  participants: Array<{
    user_id: string;
    joined_at: string;
  }>;
  profiles: Record<string, {
    full_name: string;
    avatar_url: string | null;
  }>;
}

export function TestVideoRoom({ roomId, participants, profiles }: TestVideoRoomProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { videoTrack, remoteUsers } = useAgoraRoom(roomId, user?.id || '');

  // Get participant for a slot
  const getSlotParticipant = (slot: { id: string; index: number }) => {
    if (slot.index === 1) {
      // Slot 1 always shows current user
      return participants.find(p => p.user_id === user?.id);
    }

    // For other slots, find participant based on join order
    const otherParticipants = participants
      .filter(p => p.user_id !== user?.id)
      .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
    
    return otherParticipants[slot.index - 2];
  };

  // Empty slot check helper
  const isSlotEmpty = (slot: { id: string; index: number }) => {
    const participant = getSlotParticipant(slot);
    return !participant;
  };

  // Handle room exit
  const handleLeaveRoom = async () => {
    try {
      navigate('/');
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-sm border-b border-border flex items-center px-4">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Test Video Room</h1>
        </div>
        <button
          onClick={handleLeaveRoom}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          Leave Room
        </button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 flex items-center justify-center mt-16">
        <div className="grid grid-cols-5 gap-6 w-full max-w-[1800px] mx-auto">
          {VIDEO_SLOTS.map((slot) => {
            const participant = getSlotParticipant(slot);
            const isCurrentUser = participant?.user_id === user?.id;
            const profile = participant ? profiles[participant.user_id] : null;
            
            // Find remote user's video track
            const remoteUser = participant && !isCurrentUser 
              ? remoteUsers.find(u => String(u.uid) === participant.user_id)
              : null;

            return (
              <div key={slot.id} className="group bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 shadow-xl">
                <div className="aspect-video bg-black/40 relative">
                  {/* Video Container */}
                  <div 
                    id={slot.id}
                    className="absolute inset-0"
                    ref={el => {
                      // Only set up local video in slot 1
                      if (slot.index === 1 && el && videoTrack) {
                        console.log(`[UI] Setting up local video in slot 1`);
                        el.innerHTML = '';
                        try {
                          videoTrack.play(el);
                          console.log('[UI] Successfully played local video in slot 1');
                        } catch (err) {
                          console.error('[UI] Failed to play local video:', err);
                        }
                      }
                    }}
                  />

                  {/* Empty Slot Overlay */}
                  {isSlotEmpty(slot) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="flex flex-col items-center">
                        <Icons.users className="w-6 h-6 text-white/40 mb-2" />
                        <p className="text-white/80 text-sm">Slot {slot.index} Available</p>
                      </div>
                    </div>
                  )}

                  {/* Camera Not Available Overlay */}
                  {participant && ((!videoTrack && isCurrentUser) || (!remoteUser?.videoTrack && !isCurrentUser)) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="flex flex-col items-center">
                        <Icons.video className="w-6 h-6 text-white/40 mb-2" />
                        <p className="text-white/80 text-sm">Camera not available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Participant Info */}
                {participant && (
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {profile?.full_name?.[0] || participant.user_id[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {profile?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Currently Working On
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
