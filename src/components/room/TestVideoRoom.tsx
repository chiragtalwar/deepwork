import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Icons } from '../ui/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useAgoraRoom } from '../../hooks/useAgoraRoom';
import { useRoomPresence } from '../../hooks/useRoomPresence';
import { FocusProgress } from './FocusProgress';
import { supabase } from '../../lib/supabase';

// Room ID - would come from your room management system
const TEST_ROOM_UUID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_ROOM_DURATION = 50; // 50 minutes focus session

export function TestVideoRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Debug state
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [currentFocusTask, setCurrentFocusTask] = useState('');
  const [startTime] = useState(() => new Date()); // Initialize start time when component mounts
  
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
  const handleLeaveRoom = async () => {
    try {
      // First cleanup Agora resources
      if (videoTrack) {
        videoTrack.stop();
        videoTrack.close();
      }
      if (audioTrack) {
        audioTrack.stop();
        audioTrack.close();
      }

      // Remove from room_participants
      if (user?.id) {
        await supabase
          .from('room_participants')
          .delete()
          .match({ room_id: TEST_ROOM_UUID, user_id: user.id });
      }

      // Finally navigate
      navigate('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      navigate('/');
    }
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
          <div className="flex justify-between items-start">
            {/* Left: Title */}
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight drop-shadow-lg">
                Deep Work Room
              </h1>
              <p className="text-white/90 mt-1 tracking-wide font-light">
                Focus together, achieve more
              </p>
            </div>

            {/* Top Right: Yoda Guide */}
            <div className="absolute top-0 right-0 flex items-start">
              <div className="relative flex items-start">
                {/* Yoda's Message */}
                <div className="relative mr-1 mt-20">
                  <div className="space-y-1.3">
                    <p className="text-blue-50/90 text-sm font-medium">
                      Welcome <span className="text-white">Members</span>
                    </p>
                    <p className="text-blue-50/80 text-sm">
                      No introductions needed—just relax!

                    </p>
                    <p className="text-blue-50/80 text-sm">
                      And remember:  

                    </p>
                    <p className="text-white font-medium text-sm italic">
                      "May the focus be with you"
                    </p>
                  </div>
                </div>

                {/* Yoda Image */}
                <img 
                  src="/assets/focuso.png" 
                  alt="Focus Guide" 
                  className="w-40 h-40 object-contain drop-shadow-2xl transform translate-y-14"
                />
              </div>
            </div>
          </div>

          {/* Center: Progress Card */}
          <div className="absolute left-1/2 top-6 -translate-x-1/2">
            <div className="w-[320px] bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md rounded-xl border border-white/20 shadow-xl p-1">
              <div className="bg-gradient-to-b from-black/20 to-black/5 rounded-lg p-4 border border-white/[0.06]">
                <FocusProgress 
                  duration={TEST_ROOM_DURATION}
                  startTime={startTime}
                  onSessionComplete={() => navigate('/rooms')}
                />
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="flex-1 flex items-center justify-center mt-16">
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
                .filter(p => {
                  // Filter out:
                  // 1. Current user
                  // 2. Participants who have left (no remote user)
                  const remoteUser = remoteUsers.find(u => u.uid === p.user_id);
                  return p.user_id !== user?.id && remoteUser;
                })
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
                              <p className="text-white/80 text-sm">Camera not available</p>
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
              {Array.from({ length: Math.max(0, 4 - (participants.filter(p => {
                const remoteUser = remoteUsers.find(u => u.uid === p.user_id);
                return p.user_id !== user?.id && remoteUser;
              }).length)) }).map((_, i) => (
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

          {/* Bottom Right: Leave Button */}
          <div className="fixed bottom-6 right-6">
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
      </div>
    </div>
  );
}