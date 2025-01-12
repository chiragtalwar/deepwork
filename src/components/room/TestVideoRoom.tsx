import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
  ClientRole
} from 'agora-rtc-sdk-ng';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Icons } from '../ui/icons';
import { supabase } from '../../lib/supabase';

// Define types for our room system
interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  title?: string;
  bio?: string;
  deep_work_sessions?: number;
}

interface Participant {
  id: string;
  user_id: string;
  room_id: string;
  joined_at: string;
  status: 'focus' | 'break' | 'away';
  current_focus_task?: string;
}

// Constants for the room system
const ROOM_CONFIG = {
  MAX_PARTICIPANTS: 5,
  HEARTBEAT_INTERVAL: 30000,    // 30 seconds
  PRESENCE_TIMEOUT: 90000,      // 90 seconds
  CLEANUP_INTERVAL: 120000,     // 2 minutes
  VIDEO_CONFIG: {
    normal: {
      width: 640,
      height: 360,
      frameRate: 15,
      bitrateMin: 200,
      bitrateMax: 400,
      optimizationMode: "detail"
    },
    background: {
      width: 480,      // Slightly reduced
      height: 270,     // Maintain aspect ratio
      frameRate: 10,   // Still decent framerate
      bitrateMin: 150, // Reduced but not too low
      bitrateMax: 300
    }
  }
} as const;

// Initialize Agora client with optimal settings for deep work
const client = AgoraRTC.createClient({ 
  mode: "rtc", 
  codec: "vp8",
  role: "host"
});

// Room ID - would come from your room management system
const TEST_ROOM_UUID = '123e4567-e89b-12d3-a456-426614174000';

export function TestVideoRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [isInitializing, setIsInitializing] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [profiles, setProfiles] = useState<{ [key: string]: Profile }>({});
  const [currentFocusTask, setCurrentFocusTask] = useState<string>('');
  const [status, setStatus] = useState<'focus' | 'break' | 'away'>('focus');
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const connectionStateRef = useRef<string>('DISCONNECTED');
  const joinInProgressRef = useRef(false);

  // Refs for managing resources
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<{ [uid: string]: HTMLDivElement | null }>({});
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const cleanupIntervalRef = useRef<NodeJS.Timeout>();
  const lastVisibilityState = useRef<'visible' | 'hidden'>('visible');
  const videoContainersRef = useRef<{ [uid: string]: HTMLDivElement | null }>({});

  // Enhanced logging with timestamps
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${timestamp}: ${message}`);
    setDebugLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  // Initialize tracks with optimal settings and retry logic
  const initializeTracks = async () => {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: ROOM_CONFIG.VIDEO_CONFIG.normal,
          optimizationMode: 'detail',
          facingMode: "user"
        }).catch(async (err) => {
          addLog(`Video track creation failed: ${err.message}`);
          // Fallback to lower quality if initial fails
          return await AgoraRTC.createCameraVideoTrack({
            encoderConfig: ROOM_CONFIG.VIDEO_CONFIG.background,
            optimizationMode: 'motion'
          });
        });

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'speech_low_quality',
          AGC: true,
          AEC: true,
          ANS: true
        });

        return { videoTrack, audioTrack };
      } catch (error) {
        attempts++;
        addLog(`Track initialization attempt ${attempts} failed: ${error}`);
        if (attempts === maxAttempts) {
          throw new Error(`Failed to initialize tracks after ${maxAttempts} attempts: ${error}`);
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Failed to initialize tracks');
  };

  // Minimal visibility handler - just optimize resources
  const handleVisibilityChange = async () => {
    if (!videoTrackRef.current) return;
    
    const isHidden = document.hidden;
    
    try {
      // Just adjust video quality, don't stop/start anything
      await videoTrackRef.current.setEncoderConfiguration(
        isHidden ? ROOM_CONFIG.VIDEO_CONFIG.background : ROOM_CONFIG.VIDEO_CONFIG.normal
      );
    } catch (error) {
      addLog(`Video quality adjustment error: ${error}`);
    }
  };

  // Update presence in the room
  const updatePresence = async () => {
    if (!user) return;
    
    try {
      const now = new Date().toISOString();
      
      // First check if room exists
      const { data: roomExists } = await supabase
        .from('rooms')
        .select('id')
        .eq('id', TEST_ROOM_UUID)
        .single();

      // Create room if it doesn't exist
      if (!roomExists) {
        await supabase
          .from('rooms')
          .insert({
            id: TEST_ROOM_UUID,
            name: 'Deep Work Room',
            max_participants: ROOM_CONFIG.MAX_PARTICIPANTS
          });
      }

      // Now update presence
      const { error } = await supabase
        .from('room_participants')
        .upsert({
          room_id: TEST_ROOM_UUID,
          user_id: user.id,
          joined_at: now,
          status: status,
          current_focus_task: currentFocusTask
        }, {
          onConflict: 'room_id,user_id'
        });

      if (error) {
        addLog(`Failed to update presence: ${error.message}`);
      }
    } catch (error) {
      addLog(`Presence update error: ${error}`);
    }
  };

  // Fetch and update participant profiles
  const fetchProfiles = async (participantIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', participantIds);

      if (error) {
        addLog(`Failed to fetch profiles: ${error.message}`);
        return;
      }

      const profileMap = data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as { [key: string]: Profile });

      setProfiles(profileMap);
    } catch (error) {
      addLog(`Profile fetch error: ${error}`);
    }
  };

  // Fetch active participants
  const fetchParticipants = async () => {
    if (!user) return;
    
    try {
      // First, clean up stale participants
      const staleThreshold = new Date(Date.now() - ROOM_CONFIG.PRESENCE_TIMEOUT).toISOString();
      await supabase
        .from('room_participants')
        .delete()
        .lt('joined_at', staleThreshold);

      // Then fetch current participants
      const { data, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', TEST_ROOM_UUID);

      if (error) {
        addLog(`Failed to fetch participants: ${error.message}`);
        return;
      }

      // Update participants state
      setParticipants(data || []);
      
      // Fetch profiles for all participants
      if (data && data.length > 0) {
        await fetchProfiles(data.map(p => p.user_id));
      }

      addLog(`Found ${data?.length || 0} participants`);
    } catch (error) {
      addLog(`Failed to fetch participants: ${error}`);
    }
  };

  // Initialize the room
  const initializeRoom = async () => {
    if (!user || joinInProgressRef.current) {
      addLog('Join already in progress or no user');
      return;
    }

    joinInProgressRef.current = true;
    setIsInitializing(true);
    addLog('Starting room initialization...');

    try {
      // Join Agora channel
      await client.join(
        import.meta.env.VITE_AGORA_APP_ID!,
        TEST_ROOM_UUID,
        null,
        user.id
      );
      addLog('Joined Agora channel');
      setIsConnected(true);

      // Initialize tracks
      const { videoTrack, audioTrack } = await initializeTracks();
      addLog('Tracks initialized successfully');

      videoTrackRef.current = videoTrack;
      audioTrackRef.current = audioTrack;

      // Setup local video
      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
        addLog('Local video playing');
      }

      // Publish tracks
      await client.publish([videoTrack, audioTrack]);
      addLog('Published tracks successfully');

      // Update presence and fetch initial participants
      await updatePresence();
      await fetchParticipants();

    } catch (error) {
      addLog(`Room initialization error: ${error}`);
      setIsConnected(false);
    } finally {
      setIsInitializing(false);
      joinInProgressRef.current = false;
    }
  };

  // Simplified connection state handler - no reconnection logic
  const handleConnectionStateChange = (curState: string, prevState: string) => {
    addLog(`Connection state changed from ${prevState} to ${curState}`);
    connectionStateRef.current = curState;
    setIsConnected(curState === 'CONNECTED');
  };

  // Initialize room only once
  useEffect(() => {
    if (!user) return;

    // Event handlers
    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      if (user.uid === client.uid) return;

      try {
        await client.subscribe(user, mediaType);
        
        if (mediaType === 'video') {
          setRemoteUsers(prev => {
            if (!prev.some(u => u.uid === user.uid)) {
              return [...prev, user];
            }
            return prev;
          });

          if (videoContainersRef.current[user.uid]) {
            user.videoTrack?.play(videoContainersRef.current[user.uid]!);
          }
        }

        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      } catch (error) {
        addLog(`Failed to handle user-published event: ${error}`);
      }
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      if (mediaType === 'video') {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      }
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      delete videoContainersRef.current[user.uid];
    };
    
    // Only initialize if we've never connected
    if (client.connectionState === 'DISCONNECTED') {
      initializeRoom();
    }

    // Set up minimal event listeners
    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);
    client.on('connection-state-change', handleConnectionStateChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start presence heartbeat
    heartbeatIntervalRef.current = setInterval(updatePresence, ROOM_CONFIG.HEARTBEAT_INTERVAL);

    return () => {
      // Only clean up if user is actually leaving the room
      cleanup();
      
      // Remove event listeners
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);
      client.off('connection-state-change', handleConnectionStateChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Simplified cleanup - only called when actually leaving the room
  const cleanup = async () => {
    addLog('Starting cleanup...');
    
    try {
      // Clear intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = undefined;
      }

      // Remove from room_participants
      if (user) {
        await supabase
          .from('room_participants')
          .delete()
          .match({ room_id: TEST_ROOM_UUID, user_id: user.id });
      }

      // Close tracks
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

      // Leave Agora channel
      if (client.connectionState === 'CONNECTED') {
        await client.leave();
      }

      // Reset states
      setParticipants([]);
      setRemoteUsers([]);
      setCurrentFocusTask('');
      setStatus('focus');
      setIsConnected(false);
    } catch (error) {
      addLog(`Cleanup error: ${error}`);
    }
  };

  // Handle room exit
  const handleLeaveRoom = async () => {
    await cleanup();
    navigate('/');
  };

  // Handle remote user video playback
  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.videoTrack && videoContainersRef.current[user.uid] && !document.hidden) {
        user.videoTrack.play(videoContainersRef.current[user.uid]!);
      }
    });
  }, [remoteUsers]);

  // Render the room UI
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
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-semibold text-white tracking-tight drop-shadow-lg">
                  Deep Work Room
                </h1>
                <p className="text-white/90 mt-1 tracking-wide font-light">
                  Focus together, achieve more
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setIsDebugVisible(!isDebugVisible)}
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Icons.activity className="w-4 h-4 mr-2" />
                  Debug
                </Button>

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

        {/* Debug Panel */}
            {isDebugVisible && (
              <div className="mt-4 bg-black/30 backdrop-blur-md rounded-xl border border-white/10">
                <div className="p-4 text-sm space-y-1">
                  <p className="text-white/90">Connection State: <span className="text-sky-400">{client.connectionState}</span></p>
                  <p className="text-white/90">Remote Users: <span className="text-sky-400">{remoteUsers.length}</span></p>
                  <p className="text-white/90">Participants: <span className="text-sky-400">{participants.length}</span></p>
                  <div className="text-white/70 mt-2 space-y-1">
            {debugLogs.map((log, i) => (
                      <div key={i} className="font-mono text-xs">{log}</div>
            ))}
          </div>
        </div>
              </div>
            )}
          </div>

          {/* Main Grid */}
          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-5 gap-6 w-full max-w-[1800px] mx-auto">
              {/* Current User Card */}
              <div className="group bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 shadow-xl">
                <div className="aspect-video bg-black/40 relative">
                  <div ref={localVideoRef} className="absolute inset-0" />
                  {isInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="flex flex-col items-center">
                        <Icons.spinner className="w-6 h-6 text-sky-400 animate-spin" />
                        <p className="text-white/90 mt-2 text-sm">Initializing...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {/* Profile Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 backdrop-blur-sm flex items-center justify-center border border-sky-500/20">
                      <span className="text-sky-300 font-medium">
                        {user && profiles[user.id]?.full_name?.[0] || 'Y'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {user && profiles[user.id]?.full_name || 'You'}
                      </h3>
                      <p className="text-sky-200/60 text-sm truncate">
                        {user && profiles[user.id]?.title || 'Deep Focus Enthusiast'}
                      </p>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="space-y-2.5">
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-white/60 text-xs font-medium mb-1">Bio</p>
                      <p className="text-white/90 text-sm line-clamp-2">
                        {user && profiles[user.id]?.bio || 'No bio added yet'}
                      </p>
                    </div>

                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-white/60 text-xs font-medium mb-1">Deep Work Sessions</p>
                      <p className="text-white/90 text-sm">
                        {user && profiles[user.id]?.deep_work_sessions || '0'} sessions completed
                      </p>
                    </div>

                    {/* Editable Focus Area */}
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-white/60 text-xs font-medium mb-1">Currently Working On</p>
                      <input
                        type="text"
                        value={currentFocusTask}
                        onChange={(e) => setCurrentFocusTask(e.target.value)}
                        onBlur={updatePresence}
                        placeholder="What are you working on?"
                        className="w-full bg-transparent text-white/90 text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-sky-500/50 rounded px-1 py-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Remote Participants */}
          {participants
            .filter(p => p.user_id !== user?.id)
                .slice(0, 4)
                .map(participant => {
                  const remoteUser = remoteUsers.find(u => u.uid === participant.user_id);
                  const profile = profiles[participant.user_id];
                  
                  return (
                    <div key={participant.user_id} className="group bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 shadow-xl">
                      <div className="aspect-video bg-black/40 relative">
                <div 
                  ref={el => {
                    videoContainersRef.current[participant.user_id] = el;
                    if (el && remoteUser?.videoTrack) {
                      remoteUser.videoTrack.play(el);
                    }
                  }}
                  className="absolute inset-0" 
                />
                        {!remoteUser?.videoTrack && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="flex flex-col items-center">
                              <Icons.video className="w-6 h-6 text-white/40 mb-2" />
                              <p className="text-white/80 text-sm">
                                {remoteUser ? 'Camera not available' : 'Connecting...'}
                              </p>
                            </div>
                </div>
                        )}
                      </div>
                      <div className="p-4">
                        {/* Profile Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-sky-500/20 backdrop-blur-sm flex items-center justify-center border border-sky-500/20">
                            <span className="text-sky-300 font-medium">
                              {profile?.full_name?.[0] || 'P'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate">
                              {profile?.full_name || `Participant ${participant.user_id.slice(0, 8)}`}
                            </h3>
                            <p className="text-sky-200/60 text-sm truncate">
                              {profile?.title || 'Deep Focus Enthusiast'}
                            </p>
                          </div>
                        </div>

                        {/* Profile Info */}
                        <div className="space-y-2.5">
                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Bio</p>
                            <p className="text-white/90 text-sm line-clamp-2">
                              {profile?.bio || 'No bio added yet'}
                            </p>
                          </div>

                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Deep Work Sessions</p>
                            <p className="text-white/90 text-sm">
                              {profile?.deep_work_sessions || '0'} sessions completed
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
              {Array.from({ length: Math.max(0, 4 - (participants.filter(p => p.user_id !== user?.id).length)) }).map((_, i) => (
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
        </div>
        {/* Version indicator */}
        <div className="fixed bottom-4 right-4 text-white/30 text-sm font-light">
          Version 2
        </div>
      </div>
    </div>
  );
}