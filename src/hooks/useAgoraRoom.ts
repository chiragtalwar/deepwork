import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser
} from 'agora-rtc-sdk-ng';

const VIDEO_CONFIG = {
  normal: {
    width: 640,
    height: 360,
    frameRate: 15,
    bitrateMin: 200,
    bitrateMax: 400,
    optimizationMode: "detail"
  },
  background: {
    width: 480,
    height: 270,
    frameRate: 10,
    bitrateMin: 150,
    bitrateMax: 300
  }
} as const;

export function useAgoraRoom(roomId: string, userId: string) {
  // Core refs - these persist through re-renders
  const client = useRef<IAgoraRTCClient>();
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const isInitializedRef = useRef(false);

  // States for external consumption
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize tracks with proper error handling
  const initializeTracks = async () => {
    try {
      // Close existing tracks first
      if (videoTrackRef.current) {
        videoTrackRef.current.close();
        videoTrackRef.current = null;
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.close();
        audioTrackRef.current = null;
      }

      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      const [videoTrack, audioTrack] = await Promise.all([
        AgoraRTC.createCameraVideoTrack({
          encoderConfig: VIDEO_CONFIG.normal,
          optimizationMode: 'detail'
        }),
        AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'speech_low_quality',
          AGC: true,
          AEC: true,
          ANS: true
        })
      ]);

      videoTrackRef.current = videoTrack;
      audioTrackRef.current = audioTrack;

      return { videoTrack, audioTrack };
    } catch (error) {
      console.error('Failed to initialize tracks:', error);
      throw new Error(`Failed to initialize tracks: ${error}`);
    }
  };

  // Handle visibility changes without disrupting the connection
  const handleVisibilityChange = async () => {
    if (!videoTrackRef.current) return;
    
    try {
      if (document.hidden) {
        await videoTrackRef.current.setEncoderConfiguration(VIDEO_CONFIG.background);
      } else {
        await videoTrackRef.current.setEncoderConfiguration(VIDEO_CONFIG.normal);
      }
    } catch (error) {
      console.error('Failed to adjust video quality:', error);
    }
  };

  // Cleanup function
  const cleanup = async () => {
    try {
      if (client.current) {
        // Unpublish tracks first
        if (videoTrackRef.current || audioTrackRef.current) {
          const tracks = [videoTrackRef.current, audioTrackRef.current].filter((track): track is ICameraVideoTrack | IMicrophoneAudioTrack => track !== null);
          await client.current.unpublish(tracks);
        }

        // Leave the channel
        await client.current.leave();
      }

      // Close tracks
      if (videoTrackRef.current) {
        videoTrackRef.current.close();
        videoTrackRef.current = null;
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.close();
        audioTrackRef.current = null;
      }

      // Reset state
      setRemoteUsers([]);
      setIsConnected(false);
      isInitializedRef.current = false;
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  // Initialize room connection
  useEffect(() => {
    if (!userId || isInitializedRef.current) return;

    const initialize = async () => {
      try {
        // Create new client instance
        client.current = AgoraRTC.createClient({ 
          mode: "rtc", 
          codec: "vp8",
          role: "host"
        });

        // Set up event listeners
        client.current.on('user-published', async (user, mediaType) => {
          try {
            await client.current?.subscribe(user, mediaType);
            
            if (mediaType === 'video') {
              setRemoteUsers(prev => {
                const exists = prev.some(u => u.uid === user.uid);
                if (!exists) {
                  return [...prev, user];
                }
                return prev.map(u => u.uid === user.uid ? user : u);
              });
            }
          } catch (error) {
            console.error('Subscribe error:', error);
          }
        });

        client.current.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            setRemoteUsers(prev => prev.map(u => u.uid === user.uid ? user : u));
          }
        });

        client.current.on('user-left', (user) => {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        // Join the channel
        await client.current.join(
          import.meta.env.VITE_AGORA_APP_ID!,
          roomId,
          null,
          userId
        );

        // Initialize and publish tracks
        const { videoTrack, audioTrack } = await initializeTracks();
        await client.current.publish([videoTrack, audioTrack]);

        isInitializedRef.current = true;
        setIsConnected(true);
      } catch (error) {
        console.error('Initialize error:', error);
        setError(`Failed to initialize room: ${error}`);
        setIsConnected(false);
        await cleanup();
      }
    };

    // Handle visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize
    initialize();

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Only cleanup if we're actually leaving the page
      if (!document.hidden) {
        cleanup();
      }
    };
  }, [roomId, userId]);

  return {
    client: client.current,
    videoTrack: videoTrackRef.current,
    audioTrack: audioTrackRef.current,
    remoteUsers,
    isConnected,
    error
  };
} 