import React, 
{ useEffect, useRef, useState } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  ILocalVideoTrack, 
  ILocalAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  UID
} from 'agora-rtc-sdk-ng';

interface VideoRoomProps {
  roomId: string;
  displayName: string;
  onError?: (error: Error) => void;
}

interface RemoteUser {
  uid: UID;
  videoTrack: IRemoteVideoTrack;
  audioTrack: IRemoteAudioTrack;
}

export function VideoRoom({ roomId, displayName, onError }: VideoRoomProps) {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  
  const localVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUserJoined = async (user: any) => {
      const participantCount = client?.remoteUsers.length ?? 0;
      
      if (participantCount >= 4) {
        alert('Room is full. Maximum 5 participants allowed for optimal focus.');
        client?.leave();
        return;
      }
    };

    client?.on('user-joined', handleUserJoined);
    
    return () => {
      client?.off('user-joined', handleUserJoined);
    };
  }, [client]);

  useEffect(() => {
    const initAgora = async () => {
      try {
        const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        setClient(agoraClient);

        agoraClient.on('user-published', async (user, mediaType) => {
          await agoraClient.subscribe(user, mediaType);
          
          if (mediaType === 'video') {
            setRemoteUsers(prev => [
              ...prev,
              {
                uid: user.uid,
                videoTrack: user.videoTrack!,
                audioTrack: user.audioTrack!
              }
            ]);
            
            user.videoTrack?.play(`video-${user.uid}`);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });

        agoraClient.on('user-unpublished', (user) => {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        await agoraClient.join('20fed17af037461e8e841dea06927d80', roomId, null, displayName);

        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();

        setLocalVideoTrack(videoTrack);
        setLocalAudioTrack(audioTrack);

        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        await agoraClient.publish([videoTrack, audioTrack]);

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize video room');
        onError?.(error);
      }
    };

    initAgora();

    return () => {
      localVideoTrack?.close();
      localAudioTrack?.close();
      client?.leave();
      setRemoteUsers([]);
    };
  }, [roomId, displayName, onError]);

  return (
    <div className="video-room-container h-full w-full bg-gray-900 p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-full">
        <div 
          ref={localVideoRef}
          className="bg-gray-800 rounded-lg overflow-hidden aspect-video"
        />
        
        {remoteUsers.map(user => (
          <div
            key={user.uid}
            id={`video-${user.uid}`}
            className="bg-gray-800 rounded-lg overflow-hidden aspect-video"
          />
        ))}
      </div>
    </div>
  );
} 