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
  const client = useRef<IAgoraRTCClient>(AgoraRTC.createClient({ 
    mode: "rtc", 
    codec: "vp8",
    role: "host"
  }));
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
      // Close existing tracks if they exist
      if (videoTrackRef.current) {
        videoTrackRef.current.close();
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.close();
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

  // Cleanup function
  const cleanup = async () => {
    try {
      // Unpublish and close tracks
      if (client.current) {
        const tracks = [videoTrackRef.current, audioTrackRef.current].filter((track): track is ICameraVideoTrack | IMicrophoneAudioTrack => track !== null);
        if (tracks.length > 0) {
          await client.current.unpublish(tracks);
        }
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

      setRemoteUsers([]);
      setIsConnected(false);
      isInitializedRef.current = false;
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  // Initialize room connection
  useEffect(() => {
    if (!userId || !roomId) return;

    const initialize = async () => {
      try {
        // Clean up existing connection if any
        await cleanup();

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
        setError(null);
      } catch (error) {
        console.error('Failed to initialize room:', error);
        setError(`Failed to initialize room: ${error}`);
        setIsConnected(false);
        await cleanup();
      }
    };

    // Set up event listeners
    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      try {
        await client.current.subscribe(user, mediaType);
        
        if (mediaType === 'video') {
          setRemoteUsers(prev => {
            if (!prev.some(u => u.uid === user.uid)) {
              return [...prev, user];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Failed to subscribe to user:', error);
      }
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      if (mediaType === 'video') {
        client.current.unsubscribe(user, mediaType);
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      }
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    client.current.on('user-published', handleUserPublished);
    client.current.on('user-unpublished', handleUserUnpublished);
    client.current.on('user-left', handleUserLeft);

    // Handle connection state changes
    client.current.on('connection-state-change', (curState, prevState) => {
      console.log(`Connection state changed from ${prevState} to ${curState}`);
      if (curState === 'DISCONNECTED') {
        setIsConnected(false);
        cleanup();
      }
    });

    // Initialize
    initialize();

    // Cleanup
    return () => {
      client.current.off('user-published', handleUserPublished);
      client.current.off('user-unpublished', handleUserUnpublished);
      client.current.off('user-left', handleUserLeft);
      cleanup();
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