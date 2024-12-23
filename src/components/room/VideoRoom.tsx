import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { ICameraVideoTrack, ILocalTrack, IMicrophoneAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { Card } from '../ui/card';
import { Icons } from '../ui/icons';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { ParticipantsList } from './ParticipantsList';
import { FocusTimer } from './FocusTimer';
import { ParticipantCard } from './ParticipantCard';
import { FocusProgress } from './FocusProgress';
import { supabase } from '../../lib/supabase';
import { useLoadingState } from '../../hooks/useLoadingState';

interface VideoRoomProps {
  roomId: string;
  displayName: string;
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

export function VideoRoom({ roomId, displayName }: VideoRoomProps) {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLDivElement>(null);
  const [client] = useState(() => AgoraRTC.createClient({ 
    mode: "rtc", 
    codec: "vp8"
  }));
  
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const mountedRef = useRef(true);

  // Add this state to track component mounting
  const [isMounted, setIsMounted] = useState(false);
  const [sessionStartTime] = useState(new Date());
  const [currentUserTask, setCurrentUserTask] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const { isLoading, withLoading, hasInitialData } = useLoadingState();

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const remoteVideoRefs = useRef<{ [uid: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    setIsMounted(true);
    mountedRef.current = true;

    // Initialize video only after component is mounted
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        initializeVideo();
      }
    }, 500);

    return () => {
      mountedRef.current = false;
      setIsMounted(false);
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  const initializeVideo = async () => {
    try {
      setIsInitializing(true);
      
      // 1. Join channel first
      await client.join(
        import.meta.env.VITE_AGORA_APP_ID!,
        roomId,
        null,
        null
      );
      console.log('Joined channel:', roomId);

      // 2. Create tracks
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

      // 3. Store tracks
      videoTrackRef.current = videoTrack;
      audioTrackRef.current = audioTrack;

      // 4. Play local video
      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
        console.log('Local video playing');
      }

      // 5. Publish tracks
      await client.publish([videoTrack, audioTrack]);
      console.log('Tracks published successfully');

      setIsInitializing(false);
    } catch (error) {
      console.error('Error initializing video:', error);
      setError('Failed to initialize video. Please try again.');
      setIsInitializing(false);
    }
  };

  const cleanup = async () => {
    console.log('Starting cleanup...');
    try {
      // Cleanup remote users first
      remoteUsers.forEach(user => {
        if (user.videoTrack) {
          user.videoTrack.stop();
        }
        if (user.audioTrack) {
          user.audioTrack.stop();
        }
      });
      setRemoteUsers([]);

      // Then cleanup local tracks
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current.close();
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current.close();
      }

      // Finally leave the channel
      if (client.connectionState === 'CONNECTED') {
        await client.leave();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  // Hide nav bar
  useEffect(() => {
    const mainNav = document.querySelector('nav');
    if (mainNav) mainNav.classList.add('hidden');
    return () => {
      if (mainNav) mainNav.classList.remove('hidden');
    };
  }, []);

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

  const handleLeave = async () => {
    try {
      // Clean up local tracks first
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current.close();
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current.close();
      }
      
      // Navigate after cleanup
      navigate('/rooms');
    } catch (error) {
      console.error('Error leaving room:', error);
      navigate('/rooms'); // Navigate anyway
    }
  };


  const handleTaskUpdate = (newTask: string) => {
    setParticipants(prev => 
      prev.map(p => 
        p.id === currentUserId 
          ? { ...p, current_focus_task: newTask }
          : p
      )
    );
  };

  const fetchParticipants = async () => {
    if (!mountedRef.current || !roomId) return;
    
    try {
      console.log('Fetching participants for room:', roomId);
      
      const { data: roomParticipants, error: roomError } = await supabase
        .from('room_participants')
        .select('user_id')
        .eq('room_id', roomId);

      if (roomError) {
        console.error('Error fetching room participants:', roomError);
        return;
      }

      console.log('Room participants:', roomParticipants);

      if (!roomParticipants?.length) {
        setParticipants([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', roomParticipants.map(p => p.user_id));

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      if (mountedRef.current && profiles) {
        setParticipants(profiles);
      }
    } catch (error) {
      console.error('Error in fetchParticipants:', error);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mountedRef.current && !isLoading) {
        fetchParticipants();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    fetchParticipants();

    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId]);

  // Add event handlers for remote users
  useEffect(() => {
    if (!client) return;

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      console.log(`Remote user ${user.uid} published ${mediaType}`);
      
      try {
        // Subscribe to the remote user
        await client.subscribe(user, mediaType);
        console.log('Subscribed to remote user:', user.uid);

        if (mediaType === 'video') {
          setRemoteUsers(prev => {
            // Check if user already exists
            if (!prev.find(u => u.uid === user.uid)) {
              return [...prev, user];
            }
            return prev;
          });

          // Ensure DOM is ready before playing
          if (remoteVideoRefs.current[user.uid]) {
            user.videoTrack?.play(remoteVideoRefs.current[user.uid]!);
            console.log('Playing remote video for user:', user.uid);
          }
        }

        if (mediaType === 'audio') {
          user.audioTrack?.play();
          console.log('Playing remote audio for user:', user.uid);
        }
      } catch (error) {
        console.error('Error handling remote user:', error);
      }
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      console.log('User left:', user.uid);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
      console.log('User unpublished:', user.uid);
      client.unsubscribe(user);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    // Add all event listeners
    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);
    client.on('user-unpublished', handleUserUnpublished);

    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-left', handleUserLeft);
      client.off('user-unpublished', handleUserUnpublished);
    };
  }, [client]);

  useEffect(() => {
    if (!roomId) return;

    // Subscribe to room_participants changes
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
          // Fetch participants when changes occur
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  // Add this function to handle room joining
  const joinRoom = async () => {
    try {
      // Add user to room_participants
      const { error } = await supabase
        .from('room_participants')
        .upsert({
          room_id: roomId,
          user_id: currentUserId,
          joined_at: new Date().toISOString(),
          is_focused: true
        });

      if (error) {
        console.error('Error joining room:', error);
        return;
      }

      // Then initialize video
      await initializeVideo();
    } catch (error) {
      console.error('Error in joinRoom:', error);
    }
  };

  // Update useEffect to use joinRoom
  useEffect(() => {
    if (!currentUserId || !roomId) return;
    
    joinRoom();

    return () => {
      // Cleanup: Remove from room_participants when leaving
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

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between px-6 h-16">
          <FocusTimer duration={60} onComplete={() => console.log('Session complete!')} />
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white/90 hover:bg-white/5"
              onClick={handleLeave}
            >
              <Icons.logOut className="h-4 w-4" />
              <span>Leave Session</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-screen">
        {/* Left: Video + Focus Progress */}
        <div className="flex-1 p-10 pt-24">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Video Container */}
            <div className="grid grid-cols-2 gap-4 auto-rows-fr">
              {/* Local Video */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
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

                {/* Error State */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center p-6 max-w-md">
                      <Icons.check className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <p className="text-white/90 mb-4">{error}</p>
                      <div className="text-sm text-white/60 mb-6">
                        <p>Troubleshooting steps:</p>
                        <ul className="list-disc list-inside mt-2">
                          <li>Check if camera is being used by another app</li>
                          <li>Ensure camera permissions are granted</li>
                          <li>Try refreshing the page</li>
                          <li>Try a different browser</li>
                        </ul>
                      </div>
                      <Button 
                        onClick={() => {
                          setError(null);
                          initializeVideo();
                        }}
                        className="bg-white/10 hover:bg-white/20"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}

                {/* Video Controls */}
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-all duration-300">
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

              {/* Remote Videos */}
              {remoteUsers.map(user => (
                <div 
                  key={user.uid}
                  className="relative rounded-2xl overflow-hidden bg-black aspect-video"
                >
                  <div
                    ref={el => remoteVideoRefs.current[user.uid] = el}
                    className="absolute inset-0"
                  />
                </div>
              ))}
            </div>

            {/* Focus Progress */}
            <FocusProgress 
              duration={60} 
              startTime={sessionStartTime}
            />
          </div>
        </div>

        {/* Right: Participants */}
        <div className="w-[380px] bg-[#0c1220] border-l border-white/[0.08] p-8 pt-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-medium text-white/90">Participants</h2>
            <span className="text-sm text-white/40">1 of 5</span>
          </div>

          <div className="grid gap-3">
            {participants.map((participant: Participant) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                isCurrentUser={participant.id === currentUserId}
                onTaskUpdate={handleTaskUpdate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 

