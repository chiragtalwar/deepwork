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

        console.log('[AGORA] Successfully joined channel:', roomId);

        // Get existing users in the channel
        const users = client.current.remoteUsers;
        console.log('[AGORA] Found existing users:', users);

        // Update remote users state with existing users
        if (users.length > 0) {
          setRemoteUsers(users);
          
          // Subscribe to existing users' tracks
          for (const user of users) {
            if (user.hasVideo) {
              await client.current.subscribe(user, 'video');
              console.log(`[AGORA] Subscribed to existing user's video: ${user.uid}`);
            }
            if (user.hasAudio) {
              await client.current.subscribe(user, 'audio');
              user.audioTrack?.play();
              console.log(`[AGORA] Subscribed to existing user's audio: ${user.uid}`);
            }
          }
        }

        // Initialize and publish local tracks
        const { videoTrack, audioTrack } = await initializeTracks();
        await client.current.publish([videoTrack, audioTrack]);
        console.log('[AGORA] Published local tracks');

        isInitializedRef.current = true;
        setIsConnected(true);
      } catch (error) {
        console.error('[AGORA] Failed to initialize:', error);
        setError(`Failed to initialize room: ${error}`);
        setIsConnected(false);
      }
    };

    // Set up event handlers
    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      try {
        console.log(`[AGORA] Remote user ${user.uid} published ${mediaType} track`);
        
        // Subscribe to the remote user's track
        await client.current.subscribe(user, mediaType);
        console.log(`[AGORA] Subscribed to ${mediaType} track of user ${user.uid}`);

        // Update remote users state
        setRemoteUsers(prev => {
          const exists = prev.some(u => u.uid === user.uid);
          if (!exists) {
            console.log(`[AGORA] Adding new user to state: ${user.uid}`);
            return [...prev, user];
          }
          console.log(`[AGORA] Updating existing user in state: ${user.uid}`);
          return prev.map(u => u.uid === user.uid ? user : u);
        });

        // Handle audio track
        if (mediaType === 'audio' && user.audioTrack) {
          user.audioTrack.play();
          console.log(`[AGORA] Playing audio for user ${user.uid}`);
        }

        // Handle video track with retry mechanism
        if (mediaType === 'video' && user.videoTrack) {
          const maxAttempts = 50;
          const interval = 100;
          let attempts = 0;

          const tryPlayVideo = () => {
            const container = document.querySelector(`[data-user-video="${user.uid}"]`);
            if (container) {
              console.log(`[AGORA] Found video container for ${user.uid}, playing video`);
              user.videoTrack?.play(container as HTMLElement);
              return true;
            }
            
            attempts++;
            console.log(`[AGORA] Attempt ${attempts}/${maxAttempts} to find container for ${user.uid}`);
            
            if (attempts < maxAttempts) {
              setTimeout(tryPlayVideo, interval);
            } else {
              console.error(`[AGORA] Failed to find video container for ${user.uid} after ${maxAttempts} attempts`);
            }
            return false;
          };

          // Start trying to play video
          tryPlayVideo();
        }
      } catch (error) {
        console.error(`[AGORA] Error handling user published event:`, error);
      }
    };

    const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      console.log(`Remote user ${user.uid} unpublished ${mediaType} track`);
      
      if (mediaType === 'video' && user.videoTrack) {
        user.videoTrack.stop();
      }
      if (mediaType === 'audio' && user.audioTrack) {
        user.audioTrack.stop();
      }
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      console.log(`Remote user ${user.uid} left the channel`);
      
      // Stop all tracks from this user
      if (user.videoTrack) user.videoTrack.stop();
      if (user.audioTrack) user.audioTrack.stop();
      
      // Remove user from the list immediately
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    // Set up event handlers
    client.current.on('user-published', handleUserPublished);
    client.current.on('user-unpublished', handleUserUnpublished);
    client.current.on('user-left', handleUserLeft);

    // Handle visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize
    initialize();

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      client.current.off('user-published', handleUserPublished);
      client.current.off('user-unpublished', handleUserUnpublished);
      client.current.off('user-left', handleUserLeft);
      
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