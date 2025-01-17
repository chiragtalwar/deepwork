import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { ICameraVideoTrack, ILocalTrack, IMicrophoneAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { Icons } from '../ui/icons';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { FocusProgress } from './FocusProgress';
import { supabase } from '../../lib/supabase';
import { useLoadingState } from '../../hooks/useLoadingState';
import { SessionCompleteModal } from './SessionCompleteModal';

interface VideoRoomProps {
  roomId: string;
  displayName: string;
  duration: number; // Duration in minutes
}

interface Participant {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  focus_goal: string;
  preferred_focus_time: string;
  current_focus_task?: string;
}

export function VideoRoom({ roomId, displayName, duration }: VideoRoomProps) {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserTask, setCurrentUserTask] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomDuration, setRoomDuration] = useState<number | null>(null);
  const [roomStartTime, setRoomStartTime] = useState<Date | null>(null);
  const { isLoading } = useLoadingState();
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  // Video refs
  const localVideoRef = useRef<HTMLDivElement>(null);
  const [client] = useState(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const mountedRef = useRef(true);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const remoteVideoRefs = useRef<{ [uid: string]: HTMLDivElement | null }>({});

  // Initialize user and video
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  // Video initialization and cleanup
  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        initializeVideo();
      }
    }, 500);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  // Initialize video function
  const initializeVideo = async () => {
    try {
      setIsInitializing(true);
      await client.join(import.meta.env.VITE_AGORA_APP_ID!, roomId, null, null);
      
      const [videoTrack, audioTrack] = await Promise.all([
        AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: 640,
            height: 360,
            frameRate: 15,
            bitrateMin: 200,
            bitrateMax: 400,
          }
        }),
        AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: "speech_low_quality"
        })
      ]);

      videoTrackRef.current = videoTrack;
      audioTrackRef.current = audioTrack;

      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }

      await client.publish([videoTrack, audioTrack]);
      setIsInitializing(false);
    } catch (error) {
      console.error('Error initializing video:', error);
      setError('Failed to initialize video. Please try again.');
      setIsInitializing(false);
    }
  };

  // Cleanup function
  const cleanup = async () => {
    try {
      // Stop all remote user tracks
      remoteUsers.forEach(user => {
        if (user.videoTrack) {
          user.videoTrack.stop();
        }
        if (user.audioTrack) {
          user.audioTrack.stop();
        }
      });
      setRemoteUsers([]);

      // Stop and close local tracks
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current.close();
        videoTrackRef.current = null;
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current.close();
        audioTrackRef.current = null;
      }

      // Clear video refs
      remoteVideoRefs.current = {};

      // Leave Agora channel if connected
      if (client && client.connectionState === 'CONNECTED') {
        await client.leave();
      }

      // Remove from room_participants
      if (currentUserId && roomId) {
        await supabase
          .from('room_participants')
          .delete()
          .match({ room_id: roomId, user_id: currentUserId });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  // Handle video/audio toggles
  const handleVideoToggle = async () => {
    try {
      if (videoTrackRef.current) {
        await videoTrackRef.current.setEnabled(!isVideoEnabled);
        setIsVideoEnabled(!isVideoEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  };

  const handleAudioToggle = async () => {
    try {
      if (audioTrackRef.current) {
        await audioTrackRef.current.setEnabled(!isAudioEnabled);
        setIsAudioEnabled(!isAudioEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle audio:', error);
    }
  };

  // Handle room exit
  const handleLeave = async () => {
    try {
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current.close();
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current.close();
      }
      navigate('/rooms');
    } catch (error) {
      console.error('Error leaving room:', error);
      navigate('/rooms');
    }
  };

  // Task update handler
  const handleTaskUpdate = async (newTask: string) => {
    try {
      await supabase
        .from('room_participants')
        .update({ current_focus_task: newTask })
        .eq('room_id', roomId)
        .eq('user_id', currentUserId);

      setCurrentUserTask(newTask);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Fetch participants
  const fetchParticipants = async () => {
    if (!mountedRef.current || !roomId) return;
    
    try {
      const { data: roomParticipants, error: roomError } = await supabase
        .from('room_participants')
        .select('user_id')
        .eq('room_id', roomId);

      if (roomError) throw roomError;

      if (!roomParticipants?.length) {
        setParticipants([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', roomParticipants.map(p => p.user_id));

      if (profilesError) throw profilesError;

      if (mountedRef.current && profiles) {
        setParticipants(profiles);
      }
    } catch (error) {
      console.error('Error in fetchParticipants:', error);
    }
  };

  // Set up participants subscription
  useEffect(() => {
    if (!roomId) return;

    const subscription = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`
        }, 
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  // Join room
  const joinRoom = async () => {
    try {
      // First check if user is already in the room
      const { data: existingParticipant } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', currentUserId)
        .single();

      // If participant exists, don't try to insert again
      if (!existingParticipant) {
        const { error: participantError } = await supabase
          .from('room_participants')
          .insert({
            room_id: roomId,
            user_id: currentUserId,
            joined_at: new Date().toISOString(),
            is_focused: true
          });

        if (participantError) throw participantError;
      }

      // Fetch room details with correct fields
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      console.log('=== Room Debug Info ===');
      console.log('Room data:', room);
      console.log('Current time:', new Date().toLocaleString());
      console.log('Room start time:', room?.start_time);
      console.log('Room duration:', room?.duration);
      console.log('Room type:', room?.room_type);
      console.log('=====================');

      if (roomError) throw roomError;
      
      if (!room) {
        console.error('No room found with id:', roomId);
        return;
      }

      // Parse the start time from the room data
      const startTimeFromDB = room.start_time ? new Date(room.start_time) : null;
      
      if (!startTimeFromDB || isNaN(startTimeFromDB.getTime())) {
        console.error('Invalid start time from DB:', room.start_time);
        return;
      }

      if (!room.duration) {
        console.error('No duration found for room');
        return;
      }

      console.log('Using room duration:', room.duration);
      setRoomDuration(room.duration);
      setRoomStartTime(startTimeFromDB);

      await initializeVideo();
    } catch (error) {
      console.error('Error in joinRoom:', error);
    }
  };

  // Add effect to monitor roomStartTime changes
  useEffect(() => {
    console.log('Room start time updated:', roomStartTime);
  }, [roomStartTime]);

  // Handle remote users
  useEffect(() => {
    if (!client) return;

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        setRemoteUsers(prev => {
          if (!prev.find(u => u.uid === user.uid)) {
            return [...prev, user];
          }
          return prev.map(u => u.uid === user.uid ? user : u);
        });
      }

      if (mediaType === 'audio' && user.audioTrack) {
        user.audioTrack.play();
      }
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);

    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-left', handleUserLeft);
    };
  }, [client]);

  // Join room on mount
  useEffect(() => {
    if (!currentUserId || !roomId) return;
    
    joinRoom();

    return () => {
      supabase
        .from('room_participants')
        .delete()
        .match({ room_id: roomId, user_id: currentUserId })
        .then(({ error }) => {
          if (error) console.error('Error leaving room:', error);
        });
      
      cleanup();
    };
  }, [currentUserId, roomId]);

  // Handle session completion
  const handleSessionComplete = async () => {
    try {
      // 1. Update user stats
      const { data: existingStats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      const lastSessionDate = existingStats?.last_session_date ? new Date(existingStats.last_session_date) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Calculate streak
      let newStreak = 1;
      if (lastSessionDate) {
        if (lastSessionDate.getTime() === today.getTime()) {
          newStreak = existingStats.current_streak; // Maintain streak
        } else if (lastSessionDate.getTime() === yesterday.getTime()) {
          newStreak = existingStats.current_streak + 1; // Increment streak
        }
      }

      // Calculate weekly focus time
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weeklyMinutes = (existingStats?.weekly_focus_minutes || 0) + roomDuration;

      const statsData = {
        user_id: currentUserId,
        total_sessions: (existingStats?.total_sessions || 0) + 1,
        current_streak: newStreak,
        weekly_focus_minutes: weeklyMinutes,
        last_session_date: today.toISOString(),
        created_at: existingStats ? undefined : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 2. Clean up video resources first
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current.close();
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current.close();
      }

      // 3. Leave Agora channel
      if (client.connectionState === 'CONNECTED') {
        await client.leave();
      }

      // 4. Remove from room_participants
      await supabase
        .from('room_participants')
        .delete()
        .match({ room_id: roomId, user_id: currentUserId });

      // 5. Update stats after cleanup
      const { error: upsertError } = await supabase
        .from('user_stats')
        .upsert(statsData);

      if (upsertError) throw upsertError;

      // 6. Finally, navigate to rooms with celebration state
      navigate('/rooms', { 
        state: { 
          showCelebration: true,
          sessionDuration: roomDuration 
        } 
      });

    } catch (error) {
      console.error('Error completing session:', error);
      // Even if stats update fails, ensure we cleanup and exit
      cleanup();
      navigate('/rooms');
    }
  };

  // Handle modal close and redirect
  const handleCompleteModalClose = () => {
    setShowCompleteModal(false);
    navigate('/rooms');
  };

  // Main render
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

          {/* Center: Progress Card */}
          <div className="absolute left-1/2 top-6 -translate-x-1/2">
            <div className="w-[320px] bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md rounded-xl border border-white/20 shadow-xl p-1">
              <div className="bg-gradient-to-b from-black/20 to-black/5 rounded-lg p-4 border border-white/[0.06]">
                {roomStartTime && roomDuration ? (
                  <FocusProgress 
                    duration={roomDuration}
                    startTime={roomStartTime}
                    onSessionComplete={handleSessionComplete}
                  />
                ) : (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white/30" />
                  </div>
                )}
              </div>
          </div>
        </div>

          {/* Main Grid */}
          <div className="flex-1 flex items-center justify-center mt-16">
            <div className="grid grid-cols-5 gap-6 w-full max-w-[1800px] mx-auto">
              {/* Current User Card */}
              <div className="group bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 shadow-xl">
                <div className="aspect-video bg-black/40 relative">
                <div ref={localVideoRef} className="absolute inset-0" />
                
                {/* Loading State */}
                {isInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/30" />
                      <p className="text-sm text-white/70">Initializing video...</p>
                    </div>
                  </div>
                )}

                {/* Video Controls */}
                  <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20"
                      onClick={handleVideoToggle}
                    >
                      {isVideoEnabled ? 
                        <Icons.video className="h-5 w-5" /> : 
                        <Icons.videoOff className="h-5 w-5 text-red-400" />
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20"
                      onClick={handleAudioToggle}
                    >
                      {isAudioEnabled ? 
                        <Icons.mic className="h-5 w-5" /> : 
                        <Icons.micOff className="h-5 w-5 text-red-400" />
                      }
                    </Button>
                  </div>
                </div>
              </div>

                <div className="p-4">
                  {/* Profile Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 backdrop-blur-sm flex items-center justify-center border border-sky-500/20">
                      <span className="text-sky-300 font-medium">
                        {participants.find(p => p.id === currentUserId)?.full_name?.[0] || 'Y'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {participants.find(p => p.id === currentUserId)?.full_name || 'You'}
                      </h3>
                      <p className="text-sky-200/60 text-sm truncate">
                        {participants.find(p => p.id === currentUserId)?.focus_goal || 'Deep Focus Enthusiast'}
                      </p>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="space-y-2.5">
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-white/60 text-xs font-medium mb-1">Bio</p>
                      <p className="text-white/90 text-sm line-clamp-2">
                        {participants.find(p => p.id === currentUserId)?.bio || 'No bio added yet'}
                      </p>
                    </div>

                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-white/60 text-xs font-medium mb-1">Deep Work Sessions</p>
                      <p className="text-white/90 text-sm">
                        {participants.find(p => p.id === currentUserId)?.preferred_focus_time || '0'} sessions completed
                      </p>
                    </div>

                    {/* Editable Focus Area */}
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-white/60 text-xs font-medium mb-1">Currently Working On</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={currentUserTask}
                          onChange={(e) => setCurrentUserTask(e.target.value)}
                          placeholder="What are you working on?"
                          className="flex-1 bg-transparent text-white/90 text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-sky-500/50 rounded px-1 py-0.5"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 rounded-full bg-sky-500/10 hover:bg-sky-500/20"
                          onClick={() => handleTaskUpdate(currentUserTask)}
                        >
                          <Icons.check className="h-3 w-3 text-sky-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remote Participants */}
              {participants
                .filter(p => p.id !== currentUserId)
                .map(participant => {
                  const remoteUser = remoteUsers.find(u => u.uid === participant.id);
                  
                  return (
                    <div key={participant.id} className="group bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 shadow-xl">
                      <div className="aspect-video bg-black/40 relative">
                        <div 
                          ref={el => {
                            if (el) {
                              remoteVideoRefs.current[participant.id] = el;
                              if (remoteUser?.videoTrack) {
                                remoteUser.videoTrack.play(el);
                              }
                            }
                          }}
                          className="absolute inset-0"
                        />
                        {!remoteUser?.videoTrack && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="flex flex-col items-center">
                              <Icons.video className="w-6 h-6 text-white/40 mb-2" />
                              <p className="text-white/80 text-sm">Camera not available</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        {/* Profile Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-sky-500/20 backdrop-blur-sm flex items-center justify-center border border-sky-500/20">
                            <span className="text-sky-300 font-medium">
                              {participant.full_name?.[0] || 'P'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate">
                              {participant.full_name}
                            </h3>
                            <p className="text-sky-200/60 text-sm truncate">
                              {participant.focus_goal || 'Deep Focus Enthusiast'}
                            </p>
                          </div>
                        </div>

                        {/* Profile Info */}
                        <div className="space-y-2.5">
                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Bio</p>
                            <p className="text-white/90 text-sm line-clamp-2">
                              {participant.bio || 'No bio added yet'}
                            </p>
                          </div>

                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Deep Work Sessions</p>
                            <p className="text-white/90 text-sm">
                              {participant.preferred_focus_time || '0'} sessions completed
                            </p>
                          </div>

                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Currently Working On</p>
                            <p className="text-white/90 text-sm">
                              {participant.current_focus_task || 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Empty Slots */}
              {Array.from({ length: Math.max(0, 4 - participants.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="group bg-white/5 backdrop-blur-md rounded-xl overflow-hidden border border-white/5 shadow-lg">
                  <div className="aspect-video bg-black/20 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <Icons.users className="w-8 h-8 text-white/20 mb-2" />
                      <p className="text-white/40 text-sm">Empty Seat</p>
                    </div>
                  </div>
                  <div className="p-4">
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
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Right: Leave Button */}
          <div className="fixed bottom-6 right-6">
            <Button 
              onClick={handleLeave}
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
