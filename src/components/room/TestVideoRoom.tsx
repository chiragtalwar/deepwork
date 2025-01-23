import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgoraRoom } from '@/hooks/useAgoraRoom';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { useUser } from '@/hooks/useUser';
import { Icons } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useUserStats } from '@/hooks/useUserStats';

// Define our video slots
const VIDEO_SLOTS = [
  { id: 'video-slot-1', index: 1 },
  { id: 'video-slot-2', index: 2 },
  { id: 'video-slot-3', index: 3 },
  { id: 'video-slot-4', index: 4 },
  { id: 'video-slot-5', index: 5 },
];

// Use a fixed UUID for the test room
const TEST_ROOM_ID = '123e4567-e89b-12d3-a456-426614174000';

interface TestVideoRoomProps {
  roomId?: string; // Make optional since we'll use TEST_ROOM_ID by default
}

// Helper function to format minutes into hours
const formatHours = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

export function TestVideoRoom({ roomId = TEST_ROOM_ID }: TestVideoRoomProps) {
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
  const userIds = useMemo(() => {
    const participantIds = participants.map(p => p.user_id);
    const remoteIds = remoteUsers.map(u => String(u.uid));
    return [...new Set([...participantIds, ...remoteIds])];
  }, [participants, remoteUsers]);

  // Use the improved useUserStats hook
  const { stats: userStats } = useUserStats(userIds);

  // Add debug logging for stats updates
  useEffect(() => {
    console.log('[TEST_ROOM] Current stats:', userStats);
    console.log('[TEST_ROOM] Current participants:', participants);
    console.log('[TEST_ROOM] Current remote users:', remoteUsers);
  }, [userStats, participants, remoteUsers]);

  // Subscribe to room_participants changes
  useEffect(() => {
    let isSubscribed = true;

    // Fetch initial participants data
    const fetchInitialData = async () => {
      console.log('[ROOM] Fetching initial data for room:', roomId);
      
      try {
        // First fetch current user's profile
        if (user?.id) {
          const { data: currentUserProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, bio')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('[ROOM] Error fetching current user profile:', profileError);
          } else if (currentUserProfile && isSubscribed) {
            console.log('[ROOM] Current user profile:', currentUserProfile);
            setProfiles(prev => ({
              ...prev,
              [user.id]: currentUserProfile
            }));
          }
        }

        // Then fetch all participants
        const { data: initialParticipants, error: participantsError } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', roomId);

        if (participantsError) {
          console.error('[ROOM] Error fetching participants:', participantsError);
          return;
        }

        if (initialParticipants && isSubscribed) {
          console.log('[ROOM] Initial participants:', initialParticipants);
          setParticipants(initialParticipants);
          
          // Fetch profiles for all participants
          const participantIds = initialParticipants.map(p => p.user_id);
          if (participantIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, bio')
              .in('id', participantIds);

            if (profilesError) {
              console.error('[ROOM] Error fetching profiles:', profilesError);
            } else if (profiles && isSubscribed) {
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
        }
      } catch (error) {
        console.error('[ROOM] Error in fetchInitialData:', error);
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
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`
        }, 
        async (payload) => {
          console.log('[ROOM] Participant change:', payload);
          
          // Refetch all participants to ensure consistency
          const { data: currentParticipants, error: participantsError } = await supabase
            .from('room_participants')
            .select('*')
            .eq('room_id', roomId);

          if (participantsError) {
            console.error('[ROOM] Error fetching current participants:', participantsError);
            return;
          }

          if (currentParticipants && isSubscribed) {
            console.log('[ROOM] Updated participants:', currentParticipants);
            setParticipants(currentParticipants);

            // Fetch any missing profiles
            const missingProfileIds = currentParticipants
              .map(p => p.user_id)
              .filter(id => !profiles[id]);

            if (missingProfileIds.length > 0) {
              const { data: newProfiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, bio')
                .in('id', missingProfileIds);

              if (profilesError) {
                console.error('[ROOM] Error fetching profiles:', profilesError);
              } else if (newProfiles && isSubscribed) {
                console.log('[ROOM] New profiles:', newProfiles);
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
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [roomId, user?.id]);

  // Subscribe to Agora client events for immediate user updates
  useEffect(() => {
    if (!client) return;

    const handleUserJoined = async (user: any) => {
      console.log('[ROOM] Agora user joined:', user);
      const remoteId = String(user.uid);
      
      // Immediately update participants
      setParticipants(prev => {
        const existingIds = new Set(prev.map(p => p.user_id));
        if (existingIds.has(remoteId)) return prev;
        
        console.log('[ROOM] Adding new participant immediately:', remoteId);
        return [...prev, {
          user_id: remoteId,
          room_id: roomId,
          joined_at: new Date().toISOString(),
          isTemporary: true
        }];
      });

      // Immediately fetch and update profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio')
        .eq('id', remoteId)
        .single();

      if (profile) {
        console.log('[ROOM] Setting profile immediately:', profile);
        setProfiles(prev => ({
          ...prev,
          [remoteId]: profile
        }));
      }

      // Then sync with database
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', remoteId)
        .single();

      if (!existingParticipant) {
        await supabase
          .from('room_participants')
          .insert([{
            user_id: remoteId,
            room_id: roomId,
            joined_at: new Date().toISOString()
          }]);
      }
    };

    client.on('user-joined', handleUserJoined);
    
    return () => {
      client.off('user-joined', handleUserJoined);
    };
  }, [client, roomId]);

  // Modify existing remote users effect to handle updates
  useEffect(() => {
    const handleRemoteUser = async () => {
      const remoteIds = remoteUsers.map(user => String(user.uid));
      console.log('[ROOM] Processing remote users:', remoteIds);
      
      if (remoteIds.length === 0) return;

      try {
        // Fetch final state to ensure consistency
        const { data: finalParticipants } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', roomId);

        if (finalParticipants) {
          console.log('[ROOM] Syncing final participants:', finalParticipants);
          setParticipants(finalParticipants);
        }

        // Ensure we have all profiles
        const missingProfileIds = remoteIds.filter(id => !profiles[id]);
        if (missingProfileIds.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, bio')
            .in('id', missingProfileIds);

          if (profileData) {
            const newProfiles = profileData.reduce((acc, profile) => ({
              ...acc,
              [profile.id]: profile
            }), {});
            
            setProfiles(prev => ({
              ...prev,
              ...newProfiles
            }));
          }
        }
      } catch (error) {
        console.error('[ROOM] Error in handleRemoteUser:', error);
      }
    };

    handleRemoteUser();
  }, [remoteUsers, roomId, profiles]);

  // Add immediate debug logging for state changes
  useEffect(() => {
    console.log('[ROOM] IMMEDIATE State Update:', {
      remoteUsersCount: remoteUsers.length,
      participantsCount: participants.length,
      profilesCount: Object.keys(profiles).length,
      remoteUserIds: remoteUsers.map(u => String(u.uid)),
      participantIds: participants.map(p => p.user_id),
      profileIds: Object.keys(profiles)
    });
  }, [remoteUsers, participants, profiles]);

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

  // Memoize participant mapping
  const participantMap = useMemo(() => {
    return participants.reduce((acc, participant) => {
      acc[participant.user_id] = participant;
      return acc;
    }, {} as Record<string, any>);
  }, [participants]);

  // Get participant for a slot
  const getSlotParticipant = useCallback((slot: { id: string; index: number }) => {
    // Slot 1 is always for the current user
    if (slot.index === 1) {
      if (!user) return null;
      return participantMap[user.id] || { user_id: user.id, joined_at: new Date().toISOString() };
    }

    // For slots 2-5, check remote users
    if (slot.index >= 2 && slot.index <= 5) {
      const remoteIndex = slot.index - 2;
      const remoteUser = remoteUsers[remoteIndex];
      
      if (remoteUser) {
        const uid = String(remoteUser.uid);
        return participantMap[uid] || {
          user_id: uid,
          joined_at: new Date().toISOString()
        };
      }
    }

    return null;
  }, [user, participantMap, remoteUsers]);

  // Empty slot check helper
  const isSlotEmpty = useCallback((slot: { id: string; index: number }) => {
    // For slot 1, check local video and user
    if (slot.index === 1) {
      return !user || !videoTrack;
    }
    
    // For other slots, only check for remote user presence
    const remoteIndex = slot.index - 2;
    const remoteUser = remoteUsers[remoteIndex];
    return !remoteUser;
  }, [user, videoTrack, remoteUsers]);

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

            {/* Top Right: Yoda Guide */}
            <div className="absolute top-0 right-0 flex items-start">
              <div className="relative flex items-start">
                {/* Yoda's Message */}
                <div className="relative mr-1 mt-20">
                  <div className="space-y-1.3">
                    <p className="text-blue-50/90 text-sm font-medium">
                      Welcome <span className="text-white">*2246*</span>
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
