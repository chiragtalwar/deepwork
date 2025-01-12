import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Icons } from '../ui/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useAgoraRoom } from '../../hooks/useAgoraRoom';
import { useRoomPresence } from '../../hooks/useRoomPresence';

// Room ID - would come from your room management system
const TEST_ROOM_UUID = '123e4567-e89b-12d3-a456-426614174000';

export function TestVideoRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Debug state
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [currentFocusTask, setCurrentFocusTask] = useState('');
  
  // Video container refs
  const localVideoRef = useRef<HTMLDivElement>(null);
  const videoContainersRef = useRef<{ [uid: string]: HTMLDivElement | null }>({});

  // Enhanced logging
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${timestamp}: ${message}`);
    setDebugLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  // Use our custom hooks
  const {
    client,
    videoTrack,
    audioTrack,
    remoteUsers,
    isConnected,
    error: agoraError
  } = useAgoraRoom(TEST_ROOM_UUID, user?.id || '');

  const {
    participants,
    profiles,
    error: presenceError,
    updateStatus,
    updateCurrentTask
  } = useRoomPresence(TEST_ROOM_UUID, user?.id || '');

  // Handle room exit
  const handleLeaveRoom = () => {
    navigate('/');
  };

  // Play local video when ref is available
  if (localVideoRef.current && videoTrack) {
    videoTrack.play(localVideoRef.current);
  }

  // Render the room UI
  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="min-h-screen relative bg-cover bg-center bg-fixed"
        style={{ 
          backgroundImage: 'url("/assets/pic8.png")',
        }}
      >
        {/* Elegant dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/30 backdrop-blur-[2px]" />
        
        {/* Main content */}
        <div className="relative z-10 h-screen flex flex-col p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-semibold text-white tracking-tight drop-shadow-lg">
                  Deep Work Room
                </h1>
                <p className="text-white/90 mt-1 tracking-wide font-light">
                  Focus together, achieve more
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setIsDebugVisible(!isDebugVisible)}
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Icons.activity className="w-4 h-4 mr-2" />
                  Debug
                </Button>

                <Button 
                  onClick={handleLeaveRoom}
                  variant="destructive"
                  size="sm"
                  className="bg-red-500/20 hover:bg-red-500/30 text-white border-0"
                >
                  <Icons.logOut className="w-4 h-4 mr-2" />
                  Leave Room
                </Button>
              </div>
            </div>

            {/* Debug Panel */}
            {isDebugVisible && (
              <div className="mt-4 bg-black/30 backdrop-blur-md rounded-xl border border-white/10">
                <div className="p-4 text-sm space-y-1">
                  <p className="text-white/90">Connection State: <span className="text-sky-400">{client.connectionState}</span></p>
                  <p className="text-white/90">Remote Users: <span className="text-sky-400">{remoteUsers.length}</span></p>
                  <p className="text-white/90">Participants: <span className="text-sky-400">{participants.length}</span></p>
                  <div className="text-white/70 mt-2 space-y-1">
                    {debugLogs.map((log, i) => (
                      <div key={i} className="font-mono text-xs">{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Grid */}
          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-5 gap-6 w-full max-w-[1800px] mx-auto">
              {/* Current User Card */}
              <div className="group bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 shadow-xl">
                <div className="aspect-video bg-black/40 relative">
                  <div ref={localVideoRef} className="absolute inset-0" />
                </div>
                <div className="p-4">
                  {/* Profile Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 backdrop-blur-sm flex items-center justify-center border border-sky-500/20">
                      <span className="text-sky-300 font-medium">
                        {user && profiles[user.id]?.full_name?.[0] || 'Y'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {user && profiles[user.id]?.full_name || 'You'}
                      </h3>
                      <p className="text-sky-200/60 text-sm truncate">
                        {user && profiles[user.id]?.title || 'Deep Focus Enthusiast'}
                      </p>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="space-y-2.5">
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-white/60 text-xs font-medium mb-1">Bio</p>
                      <p className="text-white/90 text-sm line-clamp-2">
                        {user && profiles[user.id]?.bio || 'No bio added yet'}
                      </p>
                    </div>

                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-white/60 text-xs font-medium mb-1">Deep Work Sessions</p>
                      <p className="text-white/90 text-sm">
                        {user && profiles[user.id]?.deep_work_sessions || '0'} sessions completed
                      </p>
                    </div>

                    {/* Editable Focus Area */}
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-white/60 text-xs font-medium mb-1">Currently Working On</p>
                      <input
                        type="text"
                        value={currentFocusTask}
                        onChange={(e) => setCurrentFocusTask(e.target.value)}
                        onBlur={() => updateCurrentTask(currentFocusTask)}
                        placeholder="What are you working on?"
                        className="w-full bg-transparent text-white/90 text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-sky-500/50 rounded px-1 py-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Remote Participants */}
              {participants
                .filter(p => p.user_id !== user?.id)
                .slice(0, 4)
                .map(participant => {
                  const remoteUser = remoteUsers.find(u => u.uid === participant.user_id);
                  const profile = profiles[participant.user_id];
                  
                  return (
                    <div key={participant.user_id} className="group bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 shadow-xl">
                      <div className="aspect-video bg-black/40 relative">
                        <div 
                          ref={el => {
                            videoContainersRef.current[participant.user_id] = el;
                            if (el && remoteUser?.videoTrack) {
                              remoteUser.videoTrack.play(el);
                            }
                          }}
                          className="absolute inset-0" 
                        />
                        {!remoteUser?.videoTrack && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="flex flex-col items-center">
                              <Icons.video className="w-6 h-6 text-white/40 mb-2" />
                              <p className="text-white/80 text-sm">
                                {remoteUser ? 'Camera not available' : 'Connecting...'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        {/* Profile Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-sky-500/20 backdrop-blur-sm flex items-center justify-center border border-sky-500/20">
                            <span className="text-sky-300 font-medium">
                              {profile?.full_name?.[0] || 'P'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate">
                              {profile?.full_name || `Participant ${participant.user_id.slice(0, 8)}`}
                            </h3>
                            <p className="text-sky-200/60 text-sm truncate">
                              {profile?.title || 'Deep Focus Enthusiast'}
                            </p>
                          </div>
                        </div>

                        {/* Profile Info */}
                        <div className="space-y-2.5">
                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Bio</p>
                            <p className="text-white/90 text-sm line-clamp-2">
                              {profile?.bio || 'No bio added yet'}
                            </p>
                          </div>

                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Deep Work Sessions</p>
                            <p className="text-white/90 text-sm">
                              {profile?.deep_work_sessions || '0'} sessions completed
                            </p>
                          </div>

                          <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-white/60 text-xs font-medium mb-1">Currently Working On</p>
                            <p className="text-white/90 text-sm">
                              {participant.current_focus_task || 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Empty Slots */}
              {Array.from({ length: Math.max(0, 4 - (participants.filter(p => p.user_id !== user?.id).length)) }).map((_, i) => (
                <div key={`empty-${i}`} className="group bg-white/5 backdrop-blur-md rounded-xl overflow-hidden border border-white/5 shadow-lg">
                  <div className="aspect-video bg-black/20 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <Icons.users className="w-8 h-8 text-white/20 mb-2" />
                      <p className="text-white/40 text-sm">Empty Seat</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10">
                        <Icons.user className="w-5 h-5 text-white/20" />
                      </div>
                      <div>
                        <h3 className="text-white/40 font-medium">Available Spot</h3>
                        <p className="text-white/30 text-sm">Waiting for participant...</p>
                      </div>
                    </div>
                    <div className="bg-black/10 rounded-lg p-3">
                      <p className="text-white/30 text-sm">Join this deep work session to focus together</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Version indicator */}
        <div className="fixed bottom-4 right-4 text-white/30 text-sm font-light">
          Version 8
        </div>
      </div>
    </div>
  );
}