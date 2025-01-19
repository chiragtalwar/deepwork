import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Icons } from '../ui/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useAgoraRoom } from '../../hooks/useAgoraRoom';
import { useRoomPresence } from '../../hooks/useRoomPresence';
import { FocusProgress } from './FocusProgress';
import { supabase } from '../../lib/supabase';

// Room ID - would come from your room management system
const TEST_ROOM_UUID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_ROOM_DURATION = 50; //L 50 minutes focus session

export function TestVideoRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Debug state
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [currentFocusTask, setCurrentFocusTask] = useState('');
  const [startTime] = useState(() => new Date()); // Initialize start time when component mounts
  
  // Video container refs
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<{ [uid: string]: HTMLDivElement | null }>({});

  // Enhanced logging
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${timestamp}: ${message}`);
    setDebugLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  // Use our custom hooks
  const {
    client,
    videoTrack,
    audioTrack,
    remoteUsers,
    isConnected,
    error: agoraError
  } = useAgoraRoom(TEST_ROOM_UUID, user?.id || '');

  const {
    participants,
    profiles,
    error: presenceError,
    updateStatus,
    updateCurrentTask
  } = useRoomPresence(TEST_ROOM_UUID, user?.id || '');

  // Create fixed array of 5 slots
  const VIDEO_SLOTS = Array.from({ length: 5 }).map((_, index) => ({
    id: `video-slot-${index + 1}`,
    index: index + 1
  }));

  // Find user's assigned slot
  const getUserSlot = (userId: string) => {
    const participantIndex = participants.findIndex(p => p.user_id === userId);
    return participantIndex + 1; // 1-based slot numbers
  };

  // Handle room exit
  const handleLeaveRoom = async () => {
    try {
      // First cleanup Agora resources
      if (videoTrack) {
        videoTrack.stop();
        videoTrack.close();
      }
      if (audioTrack) {
        audioTrack.stop();
        audioTrack.close();
      }

      // Leave Agora channel
      if (client && client.connectionState === 'CONNECTED') {
        await client.leave();
      }

      // Remove from room_participants
      if (user?.id) {
        const { error } = await supabase
          .from('room_participants')
          .delete()
          .match({ room_id: TEST_ROOM_UUID, user_id: user.id });
        
        if (error) {
          console.error('Error removing participant:', error);
        }
      }

      // Finally navigate
      navigate('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      // Even if there's an error, try to navigate away
      navigate('/');
    }
  };

  // Add cleanup on unmount
  useEffect(() => {
    // Cleanup function
    return () => {
      if (user?.id) {
        // Remove from room_participants when component unmounts
        supabase
          .from('room_participants')
          .delete()
          .match({ room_id: TEST_ROOM_UUID, user_id: user.id })
          .then(({ error }) => {
            if (error) {
              console.error('Error removing participant on unmount:', error);
            }
          });
      }
    };
  }, [user?.id]);

  // Handle beforeunload event
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user?.id) {
        // Sync call for beforeunload
        const cleanup = async () => {
          try {
            await supabase
              .from('room_participants')
              .delete()
              .match({ room_id: TEST_ROOM_UUID, user_id: user.id });
          } catch (error) {
            console.error('Error cleaning up on page unload:', error);
          }
        };
        cleanup();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);

  // Play local video when track is available
  useEffect(() => {
    if (localVideoRef.current && videoTrack) {
      try {
        videoTrack.play(localVideoRef.current);
        console.log("[UI] Playing local video");
      } catch (err) {
        console.error("[UI] Failed to play local video:", err);
      }
    }
  }, [videoTrack]);

  // Play remote videos when tracks are available
  useEffect(() => {
    console.log("[UI] Remote users updated:", remoteUsers);
    
    remoteUsers.forEach(user => {
      if (user.videoTrack) {
        const container = document.querySelector(`[data-user-video="${user.uid}"]`) as HTMLElement;
        if (container) {
          try {
            user.videoTrack.play(container);
            console.log(`[UI] Playing remote video for user ${user.uid}`);
          } catch (err) {
            console.error(`[UI] Failed to play remote video for user ${user.uid}:`, err);
          }
        } else {
          console.log(`[UI] Container not found for user ${user.uid}`);
        }
      }
    });
  }, [remoteUsers]);

  // Main Grid rendering
  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="min-h-screen relative bg-cover bg-center bg-fixed"
        style={{ 
          backgroundImage: 'url("/assets/pic8.png")',
        }}
      >
        {/* Elegant dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/30 backdrop-blur-[2px]" />
        
        {/* Main content */}
        <div className="relative z-10 h-screen flex flex-col p-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            {/* Left: Title */}
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight drop-shadow-lg">
                Deep Work Room VERSION 2
              </h1>
              <p className="text-white/90 mt-1 tracking-wide font-light">
                Focus together, achieve more
              </p>
            </div>

            {/* Top Right: Yoda Guide */}
            <div className="absolute top-0 right-0 flex items-start">
              <div className="relative flex items-start">
                {/* Yoda's Message */}
                <div className="relative mr-1 mt-20">
                  <div className="space-y-1.3">
                    <p className="text-blue-50/90 text-sm font-medium">
                      Welcome <span className="text-white">Members</span>
                    </p>
                    <p className="text-blue-50/80 text-sm">
                      No introductions needed—just relax!

                    </p>
                    <p className="text-blue-50/80 text-sm">
                      And remember:  

                    </p>
                    <p className="text-white font-medium text-sm italic">
                      "May the focus be with you"
                    </p>
                  </div>
                </div>

                {/* Yoda Image */}
                <img 
                  src="/assets/focuso.png" 
                  alt="Focus Guide" 
                  className="w-40 h-40 object-contain drop-shadow-2xl transform translate-y-14"
                />
              </div>
            </div>
          </div>

          {/* Center: Progress Card */}
          <div className="absolute left-1/2 top-6 -translate-x-1/2">
            <div className="w-[320px] bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md rounded-xl border border-white/20 shadow-xl p-1">
              <div className="bg-gradient-to-b from-black/20 to-black/5 rounded-lg p-4 border border-white/[0.06]">
                <FocusProgress 
                  duration={TEST_ROOM_DURATION}
                  startTime={startTime}
                  onSessionComplete={() => navigate('/rooms')}
                />
              </div>
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 flex items-center justify-center mt-16">
            <div className="grid grid-cols-5 gap-6 w-full max-w-[1800px] mx-auto">
              {VIDEO_SLOTS.map((slot) => {
                // Find participant for this slot (if any)
                const participant = participants[slot.index - 1];
                const isCurrentUser = participant?.user_id === user?.id;
                const profile = participant ? profiles[participant.user_id] : null;
                const remoteUser = participant ? remoteUsers.find(u => u.uid === participant.user_id) : null;

                return (
                  <div key={slot.id} className="group bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 shadow-xl">
                    <div className="aspect-video bg-black/40 relative">
                      {/* Video Container - Always Present */}
                      <div 
                        id={slot.id}
                        className="absolute inset-0"
                        ref={el => {
                          // Only set up local video in slot 1 if this is the current user
                          if (slot.index === 1 && isCurrentUser && el && videoTrack) {
                            console.log(`[UI] Setting up local video in slot 1`);
                            // Clear the container first
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
                      {!participant && (
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

                    {/* Participant Info Card */}
                    <div className="p-4">
                      {participant ? (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-sky-500/20 backdrop-blur-sm flex items-center justify-center border border-sky-500/20">
                              <span className="text-sky-300 font-medium">
                                {profile?.full_name?.[0] || 'P'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-medium truncate">
                                {profile?.full_name || `Participant ${participant.user_id.slice(0, 8)}`}
                                {isCurrentUser && ' (You)'}
                              </h3>
                              <p className="text-sky-200/60 text-sm truncate">
                                Slot {slot.index}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <div className="bg-black/20 rounded-lg p-3">
                              <p className="text-white/60 text-xs font-medium mb-1">Currently Working On</p>
                              {isCurrentUser ? (
                                <input
                                  type="text"
                                  value={currentFocusTask}
                                  onChange={(e) => setCurrentFocusTask(e.target.value)}
                                  onBlur={() => updateCurrentTask(currentFocusTask)}
                                  placeholder="What are you working on?"
                                  className="w-full bg-transparent text-white/90 text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-sky-500/50 rounded px-1 py-0.5"
                                />
                              ) : (
                                <p className="text-white/90 text-sm">
                                  {participant.current_focus_task || 'Not specified'}
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-sky-500/20 backdrop-blur-sm flex items-center justify-center border border-sky-500/20">
                            <span className="text-sky-300 font-medium">?</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate">Empty Slot</h3>
                            <p className="text-sky-200/60 text-sm truncate">Waiting for participant</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Right: Leave Button */}
          <div className="fixed bottom-6 right-6">
            <Button 
              onClick={handleLeaveRoom}
              variant="destructive"
              size="sm"
              className="bg-red-500/20 hover:bg-red-500/30 text-white border-0"
            >
              <Icons.logOut className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}