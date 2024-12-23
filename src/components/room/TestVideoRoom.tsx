import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser
} from 'agora-rtc-sdk-ng';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Icons } from '../ui/icons';
import { supabase } from '../../lib/supabase';

interface Participant {
  id: string;
  user_id: string;
  room_id: string;
  joined_at: string;
  is_focused: boolean;
  display_name?: string;
}

const client = AgoraRTC.createClient({ 
  mode: "rtc", 
  codec: "vp8"
});

export function TestVideoRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for room management
  const [isInitializing, setIsInitializing] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [allParticipants, setAllParticipants] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const connectionStateRef = useRef<string>('DISCONNECTED');

  // Video refs
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<{ [uid: string]: HTMLDivElement | null }>({});
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const TEST_ROOM_UUID = '123e4567-e89b-12d3-a456-426614174000';

  // Add a join state ref to prevent duplicate joins
  const joinInProgress = useRef(false);

  // Enhanced logging
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${timestamp}: ${message}`);
    setDebugLogs(prev => [...prev, `${timestamp}: ${message}`].slice(-5));
  };

  // Initialize Agora client
  useEffect(() => {
    // Connection state handling
    client.on('connection-state-change', (curState, prevState) => {
      addLog(`Connection state changed from ${prevState} to ${curState}`);
      connectionStateRef.current = curState;
      setIsConnected(curState === 'CONNECTED');
      
      // Re-sync participants when connection is restored
      if (curState === 'CONNECTED') {
        void fetchParticipants();
        void syncRemoteUsers();
      }
    });

    // User joined handler
    client.on('user-joined', async (user) => {
      addLog(`User joined: ${user.uid}`);
      setRemoteUsers(prev => {
        if (!prev.find(u => u.uid === user.uid)) {
          return [...prev, user];
        }
        return prev;
      });
    });

    // User published handler with retry logic
    client.on('user-published', async (user, mediaType) => {
      addLog(`User ${user.uid} published ${mediaType}`);
      
      const subscribeWithRetry = async (attempts = 0) => {
        try {
          await client.subscribe(user, mediaType);
          addLog(`Subscribed to ${user.uid}'s ${mediaType}`);

          if (mediaType === 'video') {
            setRemoteUsers(prev => {
              if (!prev.find(u => u.uid === user.uid)) {
                return [...prev, user];
              }
              return prev;
            });

            if (remoteVideoRefs.current[user.uid]) {
              await user.videoTrack?.play(remoteVideoRefs.current[user.uid]!);
              addLog(`Playing ${user.uid}'s video`);
            }
          }

          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        } catch (error) {
          if (attempts < 3) {
            addLog(`Retry ${attempts + 1} for ${user.uid}'s ${mediaType}`);
            setTimeout(() => subscribeWithRetry(attempts + 1), 1000);
          } else {
            addLog(`Failed to subscribe to ${user.uid}'s ${mediaType}: ${error}`);
          }
        }
      };

      void subscribeWithRetry();
    });

    // Handle user left
    client.on('user-left', (user) => {
      addLog(`User ${user.uid} left`);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    // Handle user unpublished
    client.on('user-unpublished', (user, mediaType) => {
      addLog(`User ${user.uid} unpublished ${mediaType}`);
      client.unsubscribe(user);
    });

    return () => {
      client.removeAllListeners();
    };
  }, []);

  // Join room and initialize video
  useEffect(() => {
    const initializeRoom = async () => {
      if (!user || joinInProgress.current) {
        addLog('Join already in progress or no user');
        return;
      }

      joinInProgress.current = true;
      
      try {
        setIsInitializing(true);
        addLog('Starting initialization...');

        // First check if already in room
        const { data: existing } = await supabase
          .from('room_participants')
          .select('*')
          .match({ room_id: TEST_ROOM_UUID, user_id: user.id })
          .single();

        if (existing) {
          addLog('Already in room, skipping join');
          // Still try to initialize video
        } else {
          // Add to room_participants if not already there
          const { error: joinError } = await supabase
            .from('room_participants')
            .insert({
              room_id: TEST_ROOM_UUID,
              user_id: user.id,
              joined_at: new Date().toISOString(),
              is_focused: true
            });

          if (joinError) {
            addLog(`Database join error: ${joinError.message}`);
            return;
          }
          addLog('Added to room_participants');
        }

        // Initialize Agora
        try {
          await client.join(
            import.meta.env.VITE_AGORA_APP_ID!,
            TEST_ROOM_UUID,
            null,
            user.id
          );
          addLog('Joined Agora channel');

          // Try to get media with device release first
          try {
            // Release any existing tracks
            if (videoTrackRef.current) {
              videoTrackRef.current.stop();
              videoTrackRef.current.close();
            }
            if (audioTrackRef.current) {
              audioTrackRef.current.stop();
              audioTrackRef.current.close();
            }

            // Wait a moment for devices to release
            await new Promise(resolve => setTimeout(resolve, 500));

            const videoTrack = await AgoraRTC.createCameraVideoTrack();
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            
            videoTrackRef.current = videoTrack;
            audioTrackRef.current = audioTrack;

            if (localVideoRef.current) {
              videoTrack.play(localVideoRef.current);
              addLog('Local video playing');
            }

            await client.publish([videoTrack, audioTrack]);
            addLog('Published tracks');
          } catch (mediaError) {
            addLog(`Media devices not available: ${mediaError}`);
            // Continue in room without media
          }

        } catch (agoraError) {
          addLog(`Agora error: ${agoraError}`);
        }

      } catch (error) {
        addLog(`General error: ${error}`);
      } finally {
        setIsInitializing(false);
        joinInProgress.current = false;
      }
    };

    initializeRoom();

    return () => {
      void cleanup();
    };
  }, [user]);

  // Subscribe to participant changes
  useEffect(() => {
    // Initial fetch
    fetchParticipants();

    // Create a single channel for all real-time updates
    const channel = supabase.channel(`room:${TEST_ROOM_UUID}`);

    // Handle participant changes
    channel
      .on('presence', { event: 'sync' }, () => {
        fetchParticipants();
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        addLog(`New presences: ${JSON.stringify(newPresences)}`);
        fetchParticipants();
      })
      .on('presence', { event: 'leave' }, () => {
        fetchParticipants();
      })
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'room_participants',
          filter: `room_id=eq.${TEST_ROOM_UUID}`
        }, 
        async (payload) => {
          addLog(`DB change: ${payload.eventType}`);
          await fetchParticipants();
          
          // If it's a new participant, try to reconnect Agora
          if (payload.eventType === 'INSERT') {
            await initializeAgoraConnection();
          }
        }
      );

    // Track online presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user?.id,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Add this function to handle Agora reconnection
  const initializeAgoraConnection = async () => {
    try {
      // Re-subscribe to all remote users
      const users = client.remoteUsers;
      for (const remoteUser of users) {
        if (!remoteUsers.find(u => u.uid === remoteUser.uid)) {
          await client.subscribe(remoteUser, 'video');
          await client.subscribe(remoteUser, 'audio');
          
          setRemoteUsers(prev => [...prev, remoteUser]);
          
          if (remoteUser.videoTrack && remoteVideoRefs.current[remoteUser.uid]) {
            remoteUser.videoTrack.play(remoteVideoRefs.current[remoteUser.uid]!);
          }
          if (remoteUser.audioTrack) {
            remoteUser.audioTrack.play();
          }
        }
      }
    } catch (error) {
      addLog(`Agora reconnection error: ${error}`);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', TEST_ROOM_UUID);

      if (error) {
        addLog(`Failed to fetch participants: ${error.message}`);
        return;
      }

      // Ensure we have unique participants
      const uniqueParticipants = Array.from(new Set(data.map(p => p.user_id)))
        .map(userId => data.find(p => p.user_id === userId)!);

      setParticipants(uniqueParticipants);
      setAllParticipants(uniqueParticipants.map(p => p.user_id));
      addLog(`Room has ${uniqueParticipants.length} participants`);
    } catch (error) {
      addLog(`Failed to fetch participants: ${error}`);
    }
  };

  const cleanup = async () => {
    try {
      // Stop and close tracks
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current.close();
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current.close();
      }

      // Leave Agora channel
      await client.leave();
      
      // Remove from room_participants
      if (user) {
        await supabase
          .from('room_participants')
          .delete()
          .match({ room_id: TEST_ROOM_UUID, user_id: user.id });
      }

      addLog('Cleanup completed');
    } catch (error) {
      addLog(`Cleanup error: ${error}`);
    }
  };

  const handleLeaveRoom = async () => {
    await cleanup();
    navigate('/'); // or wherever you want to redirect after leaving
  };

  // Add function to sync remote users
  const syncRemoteUsers = async () => {
    try {
      const currentRemoteUsers = client.remoteUsers;
      addLog(`Syncing remote users: ${currentRemoteUsers.length} found`);
      
      for (const user of currentRemoteUsers) {
        if (user.hasVideo) {
          await client.subscribe(user, 'video');
          if (remoteVideoRefs.current[user.uid]) {
            await user.videoTrack?.play(remoteVideoRefs.current[user.uid]!);
          }
        }
        if (user.hasAudio) {
          await client.subscribe(user, 'audio');
          user.audioTrack?.play();
        }
      }
      
      setRemoteUsers(currentRemoteUsers);
    } catch (error) {
      addLog(`Error syncing remote users: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] p-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-white text-xl">Video Room</h1>
          
          {/* Participants List */}
          <div className="bg-black/30 rounded-lg p-3">
            <h3 className="text-white/80 text-sm mb-2">
              Participants ({allParticipants.length})
            </h3>
            {allParticipants.map(participantId => (
              <div key={participantId} className="text-white/60 text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                {participantId === user?.id ? 'You' : `User ${participantId.slice(0, 8)}`}
              </div>
            ))}
          </div>
        </div>

        {/* Debug Panel */}
        <div className="bg-black/30 p-4 rounded mb-4">
          <h2 className="text-white mb-2">Debug Info:</h2>
          <p className="text-white/60">Connection State: {client.connectionState}</p>
          <p className="text-white/60">Participants: {participants.length}</p>
          <div className="text-white/60 text-sm mt-2">
            {debugLogs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>

        {/* Video Grid */}
        <div className={`grid ${participants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-20`}>
          {/* Local Video */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            <div ref={localVideoRef} className="absolute inset-0" />
            <div className="absolute bottom-4 left-4 text-white/60 text-sm">
              You ({user?.id?.slice(0, 8)})
            </div>
            {isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white">Initializing...</p>
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {participants
            .filter(p => p.user_id !== user?.id)
            .map(participant => (
              <div key={participant.user_id} className="aspect-video bg-black rounded-lg overflow-hidden relative">
                <div 
                  ref={el => remoteVideoRefs.current[participant.user_id] = el}
                  className="absolute inset-0" 
                />
                <div className="absolute bottom-4 left-4 text-white/60 text-sm">
                  Participant ({participant.user_id.slice(0, 8)})
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  {remoteUsers.find(u => u.uid === participant.user_id) ? (
                    <p className="text-white">Connecting video...</p>
                  ) : (
                    <p className="text-white">Camera not available</p>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Leave Button */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
          <Button 
            onClick={handleLeaveRoom}
            variant="default"
            size="lg"
            className="flex items-center gap-2 px-8 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Icons.logOut className="w-4 h-4" />
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  );
}