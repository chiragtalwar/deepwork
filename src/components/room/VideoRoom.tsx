import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgoraRoom } from '@/hooks/useAgoraRoom';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { useUser } from '@/hooks/useUser';
import { Icons } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useUserStats } from '@/hooks/useUserStats';
import React from 'react';
import { FocusProgress } from './FocusProgress';

// Define our video slots
const VIDEO_SLOTS = [
  { id: 'video-slot-1', index: 1 },
  { id: 'video-slot-2', index: 2 },
  { id: 'video-slot-3', index: 3 },
  { id: 'video-slot-4', index: 4 },
  { id: 'video-slot-5', index: 5 },
];

interface VideoRoomProps {
  roomId: string;
  roomStartTime?: string;
  roomDuration?: number;
  onSessionComplete?: () => void;
}

// Helper function to format minutes into hours
const formatHours = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

export function VideoRoom({ roomId, roomStartTime, roomDuration, onSessionComplete }: VideoRoomProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { videoTrack, remoteUsers, client, toggleVideo, toggleAudio } = useAgoraRoom(roomId, user?.id || '');
  const { error: presenceError } = useRoomPresence(roomId);
  const [participants, setParticipants] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [activeVideoSlots, setActiveVideoSlots] = useState<Set<string>>(new Set());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [currentTask, setCurrentTask] = useState('');
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  // Get user IDs for stats
  const userIds = participants.map(p => p.user_id);
  const { stats: userStats } = useUserStats(userIds);

  // Fetch and subscribe to participants data
  useEffect(() => {
    // Fetch initial participants data
    const fetchInitialData = async () => {
      console.log('[ROOM] Fetching participants for room:', roomId);
      
      try {
        // First, always fetch current user's profile
        if (user?.id) {
          const { data: currentUserProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, bio')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('[ROOM] Error fetching current user profile:', profileError);
          } else if (currentUserProfile) {
            console.log('[ROOM] Current user profile:', currentUserProfile);
            setProfiles(prev => ({
              ...prev,
              [user.id]: currentUserProfile
            }));
          }
        }

        // Fetch all participants for this room
        const { data: initialParticipants, error: participantsError } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', roomId);

        if (participantsError) {
          console.error('[ROOM] Error fetching participants:', participantsError);
          return;
        }

        console.log('[ROOM] Raw initial participants:', initialParticipants);
        
        if (initialParticipants && initialParticipants.length > 0) {
          setParticipants(initialParticipants);
          
          // Fetch profiles for all participants
          const participantIds = initialParticipants.map(p => p.user_id);
          console.log('[ROOM] Fetching profiles for participants:', participantIds);
          
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, bio')
            .in('id', participantIds);

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
            setProfiles(prev => ({
              ...prev,
              ...profileMap
            }));
          }
        }
      } catch (error) {
        console.error('[ROOM] Unexpected error in fetchInitialData:', error);
      }
    };

    fetchInitialData();

    // Subscribe to room_participants changes
    const subscription = supabase
      .channel(`room_participants:${roomId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'room_participants'
        }, 
        async (payload) => {
          console.log('[ROOM] Participant change payload:', payload);
          
          try {
            // Always fetch current participants after any change
            const { data: currentParticipants, error: participantsError } = await supabase
              .from('room_participants')
              .select('*')
              .eq('room_id', roomId);

            if (participantsError) {
              console.error('[ROOM] Error fetching current participants:', participantsError);
              return;
            }

            console.log('[ROOM] Current participants:', currentParticipants);
            if (currentParticipants) {
              setParticipants(currentParticipants);
              
              // Fetch any missing profiles
              const missingProfileIds = currentParticipants
                .map(p => p.user_id)
                .filter(id => !profiles[id]);

              if (missingProfileIds.length > 0) {
                console.log('[ROOM] Fetching missing profiles for:', missingProfileIds);
                const { data: newProfiles, error: profilesError } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url, bio')
                  .in('id', missingProfileIds);

                if (profilesError) {
                  console.error('[ROOM] Error fetching profiles:', profilesError);
                } else if (newProfiles) {
                  console.log('[ROOM] Adding new profiles:', newProfiles);
                  const profileMap = newProfiles.reduce((acc, profile) => ({
                    ...acc,
                    [profile.id]: profile
                  }), {});
                  setProfiles(prev => ({
                    ...prev,
                    ...profileMap
                  }));
                }
              }
            }
          } catch (error) {
            console.error('[ROOM] Error handling participant change:', error);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId, user?.id]);

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
      if (!user) return null;
      const participant = participants.find(p => p.user_id === user.id);
      if (participant) return participant;
      return { user_id: user.id, joined_at: new Date().toISOString() };
    }

    // For slots 2-5, check remote users
    if (slot.index >= 2 && slot.index <= 5) {
      const remoteIndex = slot.index - 2;
      const remoteUser = remoteUsers[remoteIndex];
      
      if (remoteUser) {
        const uid = String(remoteUser.uid);
        // First check participants array
        const participant = participants.find(p => p.user_id === uid);
        if (participant) return participant;

        // Return temporary participant
        return {
          user_id: uid,
          joined_at: new Date().toISOString()
        };
      }
    }

    return null;
  };

  // Function to fetch participant data - memoized to prevent recreating on every render
  const fetchParticipantData = React.useCallback(async (userId: string) => {
    if (!profiles[userId]) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .eq('id', userId)
          .single();

        if (!profileError && profileData) {
          setProfiles(prev => ({
            ...prev,
            [userId]: profileData
          }));
        }
      } catch (error) {
        console.error('[ROOM] Error fetching profile:', error);
      }
    }
  }, [profiles]);

  // Effect to fetch profiles for remote users - with proper dependencies
  useEffect(() => {
    const newUserIds = remoteUsers
      .map(u => String(u.uid))
      .filter(uid => !profiles[uid]);

    if (newUserIds.length > 0) {
      newUserIds.forEach(uid => fetchParticipantData(uid));
    }
  }, [remoteUsers, profiles, fetchParticipantData]);

  // Empty slot check helper
  const isSlotEmpty = (slot: { id: string; index: number }) => {
    if (slot.index === 1) return !user || !videoTrack;
    const remoteIndex = slot.index - 2;
    const remoteUser = remoteUsers[remoteIndex];
    return !remoteUser;
  };

  // Fetch profiles whenever participants change
  useEffect(() => {
    const fetchProfiles = async () => {
      const participantIds = participants.map(p => p.user_id);
      const remoteIds = remoteUsers.map(u => String(u.uid));
      const allIds = [...new Set([...participantIds, ...remoteIds])];

      if (allIds.length === 0) return;

      try {
        const { data: newProfiles, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio')
          .in('id', allIds);

        if (error) {
          console.error('[ROOM] Error fetching profiles:', error);
          return;
        }

        if (newProfiles) {
          const profileMap = newProfiles.reduce((acc, profile) => ({
            ...acc,
            [profile.id]: profile
          }), {});

          setProfiles(prev => ({
            ...prev,
            ...profileMap
          }));
        }
      } catch (error) {
        console.error('[ROOM] Error in fetchProfiles:', error);
      }
    };

    fetchProfiles();
  }, [participants, remoteUsers]);

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

  // Handle video toggle
  const handleVideoToggle = async () => {
    try {
      await toggleVideo();
      setIsVideoEnabled(!isVideoEnabled);
    } catch (error) {
      console.error('[ROOM] Failed to toggle video:', error);
    }
  };

  // Handle audio toggle
  const handleAudioToggle = async () => {
    try {
      await toggleAudio();
      setIsAudioEnabled(!isAudioEnabled);
    } catch (error) {
      console.error('[ROOM] Failed to toggle audio:', error);
    }
  };

  // Handle task update
  const handleTaskUpdate = async () => {
    if (!user?.id || !currentTask.trim()) return;

    try {
      setIsUpdatingTask(true);
      const { error } = await supabase
        .from('room_participants')
        .update({ current_focus_task: currentTask })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) throw error;
      console.log('[ROOM] Updated current task:', currentTask);
    } catch (error) {
      console.error('[ROOM] Failed to update task:', error);
    } finally {
      setIsUpdatingTask(false);
    }
  };

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
                Deep Work Room
              </h1>
              <p className="text-white/90 mt-1 tracking-wide font-light">
                Focus together, achieve more
              </p>
            </div>

            {/* Center: Progress Card */}
            <div className="absolute left-1/2 top-6 -translate-x-1/2">
              <div className="w-[320px] bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md rounded-xl border border-white/20 shadow-xl p-1">
                <div className="bg-gradient-to-b from-black/20 to-black/5 rounded-lg p-4 border border-white/[0.06]">
                  {roomStartTime && roomDuration && onSessionComplete ? (
                    <FocusProgress 
                      duration={roomDuration}
                      startTime={new Date(roomStartTime)}
                      onSessionComplete={onSessionComplete}
                    />
                  ) : (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white/30" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Right: Yoda Guide */}
            <div className="absolute top-0 right-0 flex items-start">
              <div className="relative flex items-start">
                {/* Yoda's Message */}
                <div className="relative mr-1 mt-20">
                  <div className="space-y-1.3">
                    <p className="text-blue-50/90 text-sm font-medium">
                      Welcome <span className="text-white">*Members*</span>
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

          {/* Video Grid */}
          <div className="flex-1 flex items-center justify-center mt-16">
            <div className="grid grid-cols-5 gap-6 w-full max-w-[1800px] mx-auto">
              {VIDEO_SLOTS.map((slot) => {
                const participant = getSlotParticipant(slot);
                const isCurrentUser = participant?.user_id === user?.id;
                const profile = participant ? profiles[participant.user_id] : null;
                const stats = participant ? userStats[participant.user_id] : null;
                  
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
                          <div className="flex flex-col items-center">
                            <Icons.users className="w-8 h-8 text-white/20 mb-2" />
                            <p className="text-white/40 text-sm">Empty Seat</p>
                          </div>
                        </div>
                      )}

                      {/* Video Controls for Current User */}
                      {isCurrentUser && (
                        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <button
                              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center"
                              onClick={handleVideoToggle}
                            >
                              {isVideoEnabled ? (
                                <Icons.video className="h-5 w-5 text-white" />
                              ) : (
                                <Icons.videoOff className="h-5 w-5 text-red-400" />
                              )}
                            </button>
                            <button
                              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center"
                              onClick={handleAudioToggle}
                            >
                              {isAudioEnabled ? (
                                <Icons.mic className="h-5 w-5 text-white" />
                              ) : (
                                <Icons.micOff className="h-5 w-5 text-red-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Participant Info Overlay */}
                      {participant && profile && (
                        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/80 to-transparent">
                          <div className="absolute bottom-3 left-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-sky-500/20 backdrop-blur-sm flex items-center justify-center border border-sky-500/20">
                              {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full" />
                              ) : (
                                <span className="text-sky-300 text-xs font-medium">
                                  {profile.full_name?.[0] || '?'}
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-white/90 font-medium">{profile.full_name}</span>
                            {isCurrentUser && <span className="text-xs text-sky-300/70">(You)</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Profile Info Section */}
                    <div className="p-4">
                      {participant && profile ? (
                        <div className="space-y-3">
                          {/* Bio */}
                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Bio</p>
                            <p className="text-white/90 text-sm line-clamp-2">
                              {profile.bio || 'No bio added yet'}
                            </p>
                          </div>

                          {/* Deep Work Hours */}
                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Total Deep Work</p>
                            <p className="text-white/90 text-sm">
                              {stats ? formatHours(stats.weekly_focus_minutes) : '0h'} of focused work
                            </p>
                          </div>

                          {/* Current Focus */}
                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Currently Focusing On</p>
                            {isCurrentUser ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={currentTask}
                                  onChange={(e) => setCurrentTask(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleTaskUpdate()}
                                  placeholder="What are you working on?"
                                  className="w-full bg-transparent text-white/90 text-sm placeholder:text-white/40 focus:outline-none"
                                />
                                <button
                                  onClick={handleTaskUpdate}
                                  disabled={isUpdatingTask}
                                  className="h-7 w-7 rounded-full bg-sky-500/10 hover:bg-sky-500/20 flex items-center justify-center disabled:opacity-50"
                                >
                                  {isUpdatingTask ? (
                                    <div className="h-3 w-3 border-2 border-t-transparent border-sky-400 rounded-full animate-spin" />
                                  ) : (
                                    <Icons.check className="h-3 w-3 text-sky-400" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <p className="text-white/90 text-sm">
                                {participant.current_focus_task || 'Not specified'}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10">
                              <Icons.user className="w-5 h-5 text-white/20" />
                            </div>
                            <div>
                              <h3 className="text-white/40 font-medium">Available Spot</h3>
                              <p className="text-white/30 text-sm">Waiting for participant...</p>
                            </div>
                          </div>
                          <div className="bg-black/10 rounded-lg p-3">
                            <p className="text-white/30 text-sm">Join this deep work session to focus together</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave Button */}
          <div className="absolute bottom-6 right-6">
            <button
              onClick={handleLeaveRoom}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-500/20 hover:bg-red-500/30 text-white h-10 px-4 py-2"
            >
              <Icons.logOut className="w-4 h-4 mr-2" />
              Leave Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}