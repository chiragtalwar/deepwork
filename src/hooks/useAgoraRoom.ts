import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser
} from 'agora-rtc-sdk-ng';

export function useAgoraRoom(roomId: string, userId: string) {
  // Core refs that persist through re-renders
  const client = useRef<IAgoraRTCClient>();
  const localVideoTrack = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
  
  // States
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to find a user's slot based on participant index
  const findUserSlot = (uid: string | number) => {
    // Convert uid to string for consistent comparison
    const uidStr = String(uid);
    
    // Current browser user always sees themselves in slot 1
    if (uidStr === userId) {
      console.log(`[AGORA] Current browser user ${uidStr} assigned to slot 1`);
      return 'video-slot-1';
    }
    
    // For other participants, assign slots 2-5 based on join order
    const userIndex = remoteUsers.findIndex(u => String(u.uid) === uidStr);
    const slotNumber = userIndex + 2; // +2 because slots 2-5 are for other participants
    console.log(`[AGORA] Other participant ${uidStr} assigned to slot ${slotNumber} (index: ${userIndex})`);
    return `video-slot-${slotNumber}`;
  };

  // Helper to play video with retries
  const playVideoWithRetries = async (videoTrack: any, uid: string | number, maxRetries = 5) => {
    let retries = 0;
    const tryPlay = async () => {
      const slotId = findUserSlot(uid);
      console.log(`[AGORA] Attempt ${retries + 1} to play video in slot ${slotId} for user ${uid}`);
      
      const container = document.getElementById(slotId);
      if (!container) {
        console.log(`[AGORA] Container ${slotId} not found, will retry in 1s (attempt ${retries + 1}/${maxRetries})`);
        if (retries < maxRetries) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return tryPlay();
        }
        throw new Error(`Container ${slotId} not found after ${maxRetries} retries`);
      }

      try {
        // Clear any existing content
        container.innerHTML = '';
        await videoTrack.play(container);
        console.log(`[AGORA] Successfully played video in slot ${slotId} for user ${uid}`);
      } catch (err) {
        console.error(`[AGORA] Error playing video in slot ${slotId}:`, err);
        if (retries < maxRetries) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return tryPlay();
        }
        throw err;
      }
    };

    return tryPlay();
  };

  useEffect(() => {
    if (!userId || !roomId) return;

    let mounted = true;

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

        // 2. Set up event handlers BEFORE joining
        client.current.on("user-published", async (user, mediaType) => {
          console.log(`[AGORA] User ${user.uid} published ${mediaType}`);
          
          try {
            // Subscribe to the user
            await client.current?.subscribe(user, mediaType);
            console.log(`[AGORA] Subscribed to ${user.uid}'s ${mediaType}`);

            if (mediaType === "audio" && user.audioTrack) {
              user.audioTrack.play();
              console.log(`[AGORA] Playing audio for ${user.uid}`);
            }

            // Update remote users state AFTER successful subscription
            setRemoteUsers(prev => {
              const existingUserIndex = prev.findIndex(u => String(u.uid) === String(user.uid));
              if (existingUserIndex !== -1) {
                const updatedUsers = [...prev];
                updatedUsers[existingUserIndex] = user;
                return updatedUsers;
              }
              return [...prev, user];
            });

            // For video, use our retry mechanism
            if (mediaType === "video" && user.videoTrack) {
              await playVideoWithRetries(user.videoTrack, user.uid);
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
          // Stop their tracks
          user.audioTrack?.stop();
          user.videoTrack?.stop();
          // Update state
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
          AgoraRTC.createCameraVideoTrack({
            encoderConfig: {
              width: 640,
              height: 360,
              frameRate: 15,
              bitrateMin: 200,
              bitrateMax: 400
            }
          })
        ]);

        if (!mounted) {
          audioTrack.close();
          videoTrack.close();
          return;
        }

        localAudioTrack.current = audioTrack;
        localVideoTrack.current = videoTrack;

        // 5. Publish local tracks
        await client.current.publish([audioTrack, videoTrack]);
        console.log("[AGORA] Local tracks published");

        // 6. Set initial state
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
      const cleanup = async () => {
        try {
          // Stop and close local tracks
          if (localVideoTrack.current) {
            localVideoTrack.current.stop();
            localVideoTrack.current.close();
          }
          if (localAudioTrack.current) {
            localAudioTrack.current.stop();
            localAudioTrack.current.close();
          }

          // Leave channel
          if (client.current?.connectionState === 'CONNECTED') {
            await client.current.leave();
            client.current.removeAllListeners();
            console.log("[AGORA] Left channel and cleaned up");
          }
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