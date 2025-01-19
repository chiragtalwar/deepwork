import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgoraRoom } from '@/hooks/useAgoraRoom';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { useUser } from '@/hooks/useUser';
import { Icons } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';

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
  const { videoTrack, remoteUsers, client } = useAgoraRoom(roomId, user?.id || '');
  const { error: presenceError } = useRoomPresence(roomId);
  const [activeVideoSlots, setActiveVideoSlots] = useState<Set<string>>(new Set());

  // Track video elements being added to slots
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target instanceof HTMLElement) {
          const slotId = mutation.target.id;
          const hasVideo = mutation.target.querySelector('video') !== null;
          
          setActiveVideoSlots(prev => {
            const next = new Set(prev);
            if (hasVideo) {
              next.add(slotId);
            } else {
              next.delete(slotId);
            }
            return next;
          });
        }
      });
    });

    // Observe all video slots
    VIDEO_SLOTS.forEach(slot => {
      const container = document.getElementById(slot.id);
      if (container) {
        observer.observe(container, { childList: true, subtree: true });
      }
    });

    return () => observer.disconnect();
  }, []);

  // Log state changes
  useEffect(() => {
    console.log('[ROOM] User:', user);
    console.log('[ROOM] Participants:', participants);
    console.log('[ROOM] Remote users:', remoteUsers);
  }, [user, participants, remoteUsers]);

  // Get participant for a slot
  const getSlotParticipant = (slot: { id: string; index: number }) => {
    // Slot 1 is always for the current user
    if (slot.index === 1) {
      return user ? { user_id: user.id, joined_at: new Date().toISOString() } : null;
    }

    // For slots 2-5, find participants based on join order
    if (slot.index >= 2 && slot.index <= 5) {
      // Filter out current user and sort by join time
      const otherParticipants = participants
        .filter(p => p.user_id !== user?.id)
        .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

      // Get participant for this slot (index - 2 because slots start at 2)
      const participantIndex = slot.index - 2;
      if (participantIndex < otherParticipants.length) {
        const participant = otherParticipants[participantIndex];
        console.log(`[ROOM] Slot ${slot.index}: Assigned to participant ${participant.user_id} (joined at ${participant.joined_at})`);
        return participant;
      }
    }

    console.log(`[ROOM] Slot ${slot.index}: Empty`);
    return null;
  };

  // Empty slot check helper
  const isSlotEmpty = (slot: { id: string; index: number }) => {
    const participant = getSlotParticipant(slot);
    
    // For slot 1, we need both a participant (user) and a video track
    if (slot.index === 1) {
      const hasParticipant = !!participant;
      const hasVideo = !!videoTrack;
      return !hasParticipant || !hasVideo;
    }
    
    // For other slots, check if we have both:
    // 1. A participant assigned to this slot
    // 2. An active video in the slot
    if (!participant) {
      return true;
    }

    return !activeVideoSlots.has(slot.id);
  };

  // Handle room exit
  const handleLeaveRoom = async () => {
    try {
      console.log('[ROOM] Leaving room...');

      // 1. Leave Agora channel if connected
      if (client?.connectionState === 'CONNECTED') {
        await client.leave();
        console.log('[ROOM] Left Agora channel');
      }

      // 2. Remove from room_participants
      if (user?.id) {
        const { error: deleteError } = await supabase
          .from('room_participants')
          .delete()
          .match({
            room_id: roomId,
            user_id: user.id
          });

        if (deleteError) {
          console.error('[ROOM] Error removing user from room:', deleteError);
        } else {
          console.log('[ROOM] Removed user from room_participants');
        }
      }

      // 3. Navigate away
      console.log('[ROOM] Navigating to home');
      navigate('/');
    } catch (err) {
      console.error('[ROOM] Error leaving room:', err);
      // Even if there's an error, try to navigate away
    navigate('/');
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
      <div className="absolute inset-0 pt-16 p-4">
        <div className="grid grid-cols-2 gap-4 h-full">
          {VIDEO_SLOTS.map((slot) => {
            const participant = getSlotParticipant(slot);
            const isCurrentUser = participant?.user_id === user?.id;
            const profile = participant ? profiles[participant.user_id] : null;
            
            return (
              <div key={slot.id} className="group bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 shadow-xl">
                <div className="aspect-video bg-black/40 relative">
                  {/* Video Container */}
                  <div 
                    id={slot.id}
                    data-user={participant?.user_id}
                    className="absolute inset-0" 
                  />

                  {/* Empty Slot Overlay */}
                  {isSlotEmpty(slot) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white/50 flex flex-col items-center gap-2">
                        <Icons.user className="w-8 h-8" />
                        <span className="text-sm">Empty Slot</span>
                      </div>
                    </div>
                  )}

                  {/* Participant Info */}
                  {participant && profile && (
                    <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full" />
                          ) : (
                            <Icons.user className="w-4 h-4 text-white/70" />
                          )}
                    </div>
                        <span className="text-sm text-white/90">{profile.full_name}</span>
                        {isCurrentUser && <span className="text-xs text-white/50">(You)</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
