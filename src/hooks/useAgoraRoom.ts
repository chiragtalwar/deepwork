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

  // Handle remote users
  useEffect(() => {
    if (!client.current) return;

    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      try {
        // Subscribe to the remote user
        await client.current.subscribe(user, mediaType);
        
        // Update remote users list
        setRemoteUsers(prev => {
          const exists = prev.find(u => u.uid === user.uid);
          if (!exists) {
            return [...prev, user];
          }
          return prev.map(u => u.uid === user.uid ? user : u);
        });

        // Play the track
        if (mediaType === 'audio' && user.audioTrack) {
          user.audioTrack.play();
        }
      } catch (error) {
        console.error('Failed to handle remote user published:', error);
      }
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      if (mediaType === 'video' && user.videoTrack) {
        user.videoTrack.stop();
      }
      if (mediaType === 'audio' && user.audioTrack) {
        user.audioTrack.stop();
      }
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    // Set up event handlers
    client.current.on('user-published', handleUserPublished);
    client.current.on('user-unpublished', handleUserUnpublished);
    client.current.on('user-left', handleUserLeft);

    // Cleanup
    return () => {
      client.current.off('user-published', handleUserPublished);
      client.current.off('user-unpublished', handleUserUnpublished);
      client.current.off('user-left', handleUserLeft);
    };
  }, []);

  // Initialize room connection
  useEffect(() => {
    if (!userId || isInitializedRef.current) return;

    const initialize = async () => {
      try {
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
        setError(`Failed to initialize room: ${error}`);
        setIsConnected(false);
      }
    };

    // Handle visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize
    initialize();

    // Cleanup only when truly leaving
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Only cleanup if we're actually leaving the page
      if (!document.hidden) {
        cleanup();
      }
    };
  }, [roomId, userId]);

  // Cleanup function
  const cleanup = async () => {
    try {
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

      // Leave channel
      if (client.current.connectionState === 'CONNECTED') {
        await client.current.leave();
      }

      setRemoteUsers([]);
      isInitializedRef.current = false;
      setIsConnected(false);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  return {
    client: client.current,
    videoTrack: videoTrackRef.current,
    audioTrack: audioTrackRef.current,
    remoteUsers,
    isConnected,
    error
  };
} 