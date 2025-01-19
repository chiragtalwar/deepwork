import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
  UID
} from 'agora-rtc-sdk-ng';

const VIDEO_CONFIG = {
  encoderConfig: {
    width: 640,
    height: 360,
    frameRate: 15,
    bitrateMin: 200,
    bitrateMax: 400,
  },
  optimizationMode: "detail"
} as const;

export function useAgoraRoom(roomId: string, userId: string) {
  // Core refs
  const clientRef = useRef<IAgoraRTCClient>();
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  
  // States
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !roomId) return;

    let mounted = true;

    const setupAgora = async () => {
      try {
        // 1. Create Agora Client
        const client = AgoraRTC.createClient({ 
          mode: "rtc", 
          codec: "vp8" 
        });
        clientRef.current = client;
        console.log("[AGORA] Client created");

        // 2. Create local tracks
        const [audioTrack, videoTrack] = await Promise.all([
          AgoraRTC.createMicrophoneAudioTrack(),
          AgoraRTC.createCameraVideoTrack(VIDEO_CONFIG)
        ]);
        if (!mounted) return;
        
        localAudioTrackRef.current = audioTrack;
        localVideoTrackRef.current = videoTrack;
        console.log("[AGORA] Local tracks created");

        // 3. Join the channel
        await client.join(
          import.meta.env.VITE_AGORA_APP_ID!,
          roomId,
          null,
          userId
        );
        console.log("[AGORA] Joined channel:", roomId);

        // 4. Publish local tracks
        await client.publish([audioTrack, videoTrack]);
        console.log("[AGORA] Published local tracks");

        // 5. Set up event handlers
        client.on("user-published", async (user, mediaType) => {
          console.log("[AGORA] User published:", user.uid, mediaType);
          
          try {
            // Subscribe to the remote user
            await client.subscribe(user, mediaType);
            console.log("[AGORA] Subscribed to:", user.uid, mediaType);

            // Update remote users state FIRST
            setRemoteUsers(prev => {
              const exists = prev.find(u => u.uid === user.uid);
              if (exists) {
                return prev.map(u => u.uid === user.uid ? user : u);
              }
              return [...prev, user];
            });

            // Handle audio immediately
            if (mediaType === "audio" && user.audioTrack) {
              user.audioTrack.play();
              console.log("[AGORA] Playing audio for:", user.uid);
            }

            // For video, we need to ensure the container exists
            if (mediaType === "video" && user.videoTrack) {
              console.log("[AGORA] Setting up video for:", user.uid);
              
              const playVideo = async () => {
                return new Promise<void>((resolve, reject) => {
                  let attempts = 0;
                  const maxAttempts = 20;
                  
                  const tryPlay = () => {
                    const container = document.querySelector(`[data-user-video="${user.uid}"]`);
                    if (container) {
                      try {
                        user.videoTrack?.play(container as HTMLElement);
                        console.log(`[AGORA] Successfully played video for user ${user.uid}`);
                        resolve();
                      } catch (err) {
                        console.error(`[AGORA] Error playing video for ${user.uid}:`, err);
                        reject(err);
                      }
                    } else {
                      attempts++;
                      if (attempts < maxAttempts) {
                        console.log(`[AGORA] Container not found for ${user.uid}, attempt ${attempts}/${maxAttempts}`);
                        setTimeout(tryPlay, 500);
                      } else {
                        const error = new Error(`Failed to find video container for ${user.uid} after ${maxAttempts} attempts`);
                        console.error("[AGORA]", error);
                        reject(error);
                      }
                    }
                  };
                  
                  tryPlay();
                });
              };

              playVideo().catch(err => {
                console.error("[AGORA] Final video play error:", err);
              });
            }
          } catch (err) {
            console.error("[AGORA] Error handling user published event:", err);
          }
        });

        client.on("user-unpublished", (user, mediaType) => {
          console.log("[AGORA] User unpublished:", user.uid, mediaType);
          if (mediaType === "audio") {
            user.audioTrack?.stop();
          }
          if (mediaType === "video") {
            user.videoTrack?.stop();
          }
        });

        client.on("user-left", (user) => {
          console.log("[AGORA] User left:", user.uid);
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        // 6. Set initial remote users if any
        setRemoteUsers(client.remoteUsers);
        setIsConnected(true);

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
          const client = clientRef.current;
          if (client) {
            // Stop all remote users first
            setRemoteUsers([]);
            
            // Stop and close local tracks
            if (localVideoTrackRef.current) {
              localVideoTrackRef.current.stop();
              localVideoTrackRef.current.close();
            }
            if (localAudioTrackRef.current) {
              localAudioTrackRef.current.stop();
              localAudioTrackRef.current.close();
            }

            // Leave the channel
            if (client.connectionState === 'CONNECTED') {
              await client.leave();
            }

            // Remove all event listeners
            client.removeAllListeners();
          }
        } catch (err) {
          console.error("[AGORA] Cleanup error:", err);
        }
      };
      cleanup();
    };
  }, [roomId, userId]);

  return {
    client: clientRef.current,
    videoTrack: localVideoTrackRef.current,
    audioTrack: localAudioTrackRef.current,
    remoteUsers,
    isConnected,
    error
  };
} 