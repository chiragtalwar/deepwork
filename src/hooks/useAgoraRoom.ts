import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser
} from 'agora-rtc-sdk-ng';

// Types for our hook state
interface AgoraRoomState {
  isConnected: boolean;
  error: string | null;
}

export function useAgoraRoom(roomId: string, userId: string) {
  // Core Agora client and track refs
  const client = useRef<IAgoraRTCClient>();
  const localVideoTrack = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
  
  // State
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper: Find slot for a user
  const findUserSlot = (uid: string | number) => {
    console.log(`[AGORA] Finding slot for user ${uid}, current user is ${userId}`);
    
    // Current user always goes in slot 1
    if (String(uid) === userId) {
      console.log(`[AGORA] Assigning current user ${uid} to slot 1`);
      return 'video-slot-1';
    }
    
    // For remote users, find the next available slot (2-5)
    const takenSlots = remoteUsers
      .filter(u => String(u.uid) !== userId)
      .map((_, index) => index + 2);
    
    const nextSlot = takenSlots.length > 0 ? Math.max(...takenSlots) + 1 : 2;
    
    if (nextSlot > 5) {
      console.log(`[AGORA] No available slots for user ${uid} (max capacity reached)`);
      return null;
    }
    
    console.log(`[AGORA] Assigning remote user ${uid} to slot ${nextSlot}`);
    return `video-slot-${nextSlot}`;
  };

  // Helper: Play video with retries
  const playVideoWithRetries = async (videoTrack: any, uid: string | number, maxRetries = 20) => {
    let retries = 0;
    
    const tryPlay = async () => {
      const slotId = findUserSlot(uid);
      if (!slotId) {
        console.log(`[AGORA] No slot found for user ${uid}`);
        return;
      }
      
      console.log(`[AGORA] Attempt ${retries + 1} to play video in slot ${slotId} for user ${uid}`);
      
      const container = document.getElementById(slotId);
      if (!container) {
        console.log(`[AGORA] Container ${slotId} not found, will retry in 500ms`);
        if (retries < maxRetries) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 500));
          return tryPlay();
        }
        throw new Error(`Container ${slotId} not found after ${maxRetries} retries`);
      }

      try {
        container.innerHTML = ''; // Clear existing content
        await videoTrack.play(container);
        console.log(`[AGORA] Successfully played video in slot ${slotId} for user ${uid}`);
      } catch (err) {
        console.error(`[AGORA] Error playing video:`, err);
        if (retries < maxRetries) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 500));
          return tryPlay();
        }
        throw err;
      }
    };

    return tryPlay();
  };

  // Main setup effect
  useEffect(() => {
    if (!userId || !roomId) return;
    
    let mounted = true;
    console.log(`[AGORA] Setting up room ${roomId} for user ${userId}`);

    const setupAgora = async () => {
      try {
        // 1. Create Agora Client if not exists
        if (!client.current) {
          client.current = AgoraRTC.createClient({ 
            mode: "rtc", 
            codec: "vp8" 
          });
          console.log("[AGORA] Client created");
        }

        // 2. Set up event handlers
        client.current.on("user-published", async (user, mediaType) => {
          console.log(`[AGORA] User ${user.uid} published ${mediaType}`);
          
          try {
            // Subscribe to the user
            await client.current?.subscribe(user, mediaType);
            console.log(`[AGORA] Subscribed to ${user.uid}'s ${mediaType}`);

            // Handle audio immediately
            if (mediaType === "audio" && user.audioTrack) {
              user.audioTrack.play();
              console.log(`[AGORA] Playing audio for ${user.uid}`);
            }

            // Handle video
            if (mediaType === "video" && user.videoTrack) {
              // Update remote users first
              setRemoteUsers(prev => {
                if (!prev.find(u => String(u.uid) === String(user.uid))) {
                  return [...prev, user];
                }
                return prev;
              });

              // Find slot and play video
              const slotId = findUserSlot(user.uid);
              if (!slotId) {
                console.error(`[AGORA] No valid slot found for user ${user.uid}`);
                return;
              }
              
              console.log(`[AGORA] Playing video for ${user.uid} in slot ${slotId}`);
              
              const container = document.getElementById(slotId);
              if (container) {
                container.innerHTML = '';
                await user.videoTrack.play(container);
                console.log(`[AGORA] Successfully played video in slot ${slotId}`);
              } else {
                console.error(`[AGORA] Container not found for slot ${slotId}`);
              }
            }
          } catch (err) {
            console.error(`[AGORA] Error handling user-published:`, err);
          }
        });

        client.current.on("user-unpublished", (user, mediaType) => {
          console.log(`[AGORA] User ${user.uid} unpublished ${mediaType}`);
          if (mediaType === "audio") {
            user.audioTrack?.stop();
          }
          if (mediaType === "video") {
            user.videoTrack?.stop();
          }
        });

        client.current.on("user-left", (user) => {
          console.log(`[AGORA] User ${user.uid} left`);
          user.audioTrack?.stop();
          user.videoTrack?.stop();
          setRemoteUsers(prev => prev.filter(u => String(u.uid) !== String(user.uid)));
        });

        // 3. Join the channel
        await client.current.join(
          import.meta.env.VITE_AGORA_APP_ID!,
          roomId,
          null,
          userId
        );
        console.log("[AGORA] Joined channel:", roomId);

        // 4. Create and publish local tracks
        const [audioTrack, videoTrack] = await Promise.all([
          AgoraRTC.createMicrophoneAudioTrack(),
          AgoraRTC.createCameraVideoTrack()
        ]);

        if (!mounted) {
          audioTrack.close();
          videoTrack.close();
          return;
        }

        localAudioTrack.current = audioTrack;
        localVideoTrack.current = videoTrack;

        // 5. Play local video in slot 1
        const localContainer = document.getElementById('video-slot-1');
        if (localContainer) {
          localContainer.innerHTML = '';
          await videoTrack.play(localContainer);
          console.log("[AGORA] Playing local video in slot 1");
        }

        // 6. Publish local tracks
        await client.current.publish([audioTrack, videoTrack]);
        console.log("[AGORA] Local tracks published");

        // 7. Set initial state
        setIsConnected(true);
        setRemoteUsers(client.current.remoteUsers);

      } catch (err) {
        console.error("[AGORA] Setup error:", err);
        setError(err instanceof Error ? err.message : "Failed to setup Agora");
      }
    };

    setupAgora();

    // Cleanup
    return () => {
      mounted = false;
      console.log(`[AGORA] Cleaning up room ${roomId} for user ${userId}`);
      
      const cleanup = async () => {
        try {
          if (localVideoTrack.current) {
            localVideoTrack.current.stop();
            localVideoTrack.current.close();
            localVideoTrack.current = null;
          }
          if (localAudioTrack.current) {
            localAudioTrack.current.stop();
            localAudioTrack.current.close();
            localAudioTrack.current = null;
          }
          if (client.current?.connectionState === 'CONNECTED') {
            await client.current.leave();
            client.current.removeAllListeners();
            client.current = undefined;
          }
          setIsConnected(false);
          setRemoteUsers([]);
          setError(null);
        } catch (err) {
          console.error("[AGORA] Cleanup error:", err);
        }
      };
      cleanup();
    };
  }, [roomId, userId]);

  return {
    client: client.current,
    videoTrack: localVideoTrack.current,
    audioTrack: localAudioTrack.current,
    remoteUsers,
    isConnected,
    error
  };
}
