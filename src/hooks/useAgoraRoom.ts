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
              // Play audio immediately
              user.audioTrack.play();
              console.log(`[AGORA] Playing audio for ${user.uid}`);
            }

            // Update remote users state to trigger UI update
            setRemoteUsers(prev => {
              if (prev.find(u => u.uid === user.uid)) {
                return prev.map(u => u.uid === user.uid ? user : u);
              }
              return [...prev, user];
            });
          } catch (err) {
            console.error(`[AGORA] Error handling user-published:`, err);
          }
        });

        client.current.on("user-unpublished", (user, mediaType) => {
          console.log(`[AGORA] User ${user.uid} unpublished ${mediaType}`);
          if (mediaType === "audio") {
            user.audioTrack?.stop();
          }
        });

        client.current.on("user-left", (user) => {
          console.log(`[AGORA] User ${user.uid} left`);
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
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