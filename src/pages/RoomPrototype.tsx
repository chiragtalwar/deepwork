import { useState, useRef, useEffect } from 'react';
import AgoraRTC, { ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Button } from '../components/ui/button';
import { Icons } from '../components/ui/icons';

export function RoomPrototype() {
  const [participants, setParticipants] = useState([
    {
      id: '1',
      name: 'Alex Chen',
      avatar_url: 'https://avatar.vercel.sh/alex.png',
      role: 'Software Engineer',
      focus_task: 'Building authentication system',
      is_speaking: true,
      is_video_on: true,
      is_audio_on: true
    },
    {
      id: '2',
      name: 'Sarah Wilson',
      avatar_url: 'https://avatar.vercel.sh/sarah.png',
      role: 'UX Designer',
      focus_task: 'Designing user onboarding flow',
      is_speaking: false,
      is_video_on: true,
      is_audio_on: false
    },
    {
      id: '3',
      name: 'Mike Johnson',
      avatar_url: 'https://avatar.vercel.sh/mike.png',
      role: 'Product Manager',
      focus_task: 'Sprint planning documentation',
      is_speaking: false,
      is_video_on: true,
      is_audio_on: true
    },
    {
      id: '4',
      name: 'Emma Davis',
      avatar_url: 'https://avatar.vercel.sh/emma.png',
      role: 'Frontend Developer',
      focus_task: 'Implementing responsive layouts',
      is_speaking: false,
      is_video_on: true,
      is_audio_on: true
    },
    {
      id: '5',
      name: 'James Lee',
      avatar_url: 'https://avatar.vercel.sh/james.png',
      role: 'Backend Developer',
      focus_task: 'API optimization',
      is_speaking: false,
      is_video_on: true,
      is_audio_on: true
    }
  ]);

  const [progress, setProgress] = useState(75);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);

  const [client] = useState(() => AgoraRTC.createClient({ 
    mode: "rtc", 
    codec: "vp8",
    role: "host"
  }));
  
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const mountedRef = useRef(true);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const initializeMediaDevices = async (retryCount = 0): Promise<boolean> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      const hasAudio = devices.some(device => device.kind === 'audioinput');
      
      if (!hasVideo || !hasAudio) {
        throw new Error('Required media devices not found');
      }

      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return true;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return initializeMediaDevices(retryCount + 1);
      }
      throw error;
    }
  };

  const initializeVideo = async () => {
    try {
      setIsInitializing(true);
      
      // 1. First test camera access with regular WebRTC
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      // Stop test stream immediately
      stream.getTracks().forEach(track => track.stop());

      // 2. Create Agora tracks with lower quality first
      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: {
          width: 640,
          height: 360,
          frameRate: 15,
          bitrateMin: 200,
          bitrateMax: 400,
        }
      });

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "speech_low_quality"
      });

      // 3. Store references
      videoTrackRef.current = videoTrack;
      audioTrackRef.current = audioTrack;

      // 4. Play video locally BEFORE joining channel
      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
        console.log('Playing video track locally');
      }

      // 5. Join channel
      await client.join(
        import.meta.env.VITE_AGORA_APP_ID!,
        'test-room',
        null,
        null
      );

      // 6. Publish tracks
      await client.publish([videoTrack, audioTrack]);
      console.log('Published tracks successfully');

      setIsInitializing(false);
    } catch (error) {
      console.error('Failed to initialize:', error);
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initializeVideo();
    return () => {
      mountedRef.current = false;
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current.close();
      }
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const mainNav = document.querySelector('nav');
    if (mainNav) mainNav.classList.add('hidden');
    return () => {
      if (mainNav) mainNav.classList.remove('hidden');
    };
  }, []);

  const handleVideoToggle = async () => {
    try {
      if (videoTrackRef.current) {
        await videoTrackRef.current.setEnabled(!isVideoEnabled);
        setIsVideoEnabled(!isVideoEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  };

  const handleAudioToggle = async () => {
    try {
      if (audioTrackRef.current) {
        await audioTrackRef.current.setEnabled(!isAudioEnabled);
        setIsAudioEnabled(!isAudioEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle audio:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4">
            {/* Timer with Progress */}
            <div className="relative w-10 h-10">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  className="fill-none stroke-white/5 stroke-[2]"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  className="fill-none stroke-emerald-500/40 stroke-[2]"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/90">
                45:00
              </span>
            </div>
            <span className="text-white/50 text-sm font-medium">Focus Session</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white/90 hover:bg-white/5"
          >
            <Icons.logOut className="h-4 w-4" />
            <span>Leave Session</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-screen">
        {/* Left: Video + Focus Progress */}
        <div className="flex-1 p-10 pt-24">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Video Container */}
            <div className="relative rounded-2xl overflow-hidden bg-black/20 aspect-video border border-white/5">
              <div 
                ref={localVideoRef} 
                className="absolute inset-0 bg-black"
              />
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icons.moon className="w-6 h-6 animate-spin" />
                </div>
              )}
              
              {/* Video Controls */}
              <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-all duration-300">
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20"
                    onClick={handleVideoToggle}
                  >
                    {isVideoEnabled ? 
                      <Icons.video className="h-5 w-5" /> : 
                      <Icons.videoOff className="h-5 w-5 text-red-400" />
                    }
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20"
                    onClick={handleAudioToggle}
                  >
                    {isAudioEnabled ? 
                      <Icons.mic className="h-5 w-5" /> : 
                      <Icons.micOff className="h-5 w-5 text-red-400" />
                    }
                  </Button>
                </div>
              </div>
            </div>

            {/* Focus Progress Section */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icons.target className="w-4 h-4 text-emerald-500/70" />
                  <h3 className="text-sm font-medium text-white/80">Focus Progress</h3>
                </div>
                <span className="text-2xl font-semibold text-white/90">75%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 rounded-full bg-white/[0.03] overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500/50 to-emerald-400/50 transition-all duration-1000"
                  style={{ width: '75%' }}
                />
              </div>

              {/* Stats */}
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-white/40">Focused Time</p>
                    <p className="text-white/90 font-medium">34 minutes</p>
                  </div>
                  <div>
                    <p className="text-white/40">Remaining</p>
                    <p className="text-white/90 font-medium">11 minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm text-emerald-400">In Focus</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Participants */}
        <div className="w-[380px] bg-[#0c1220] border-l border-white/[0.08] p-8 pt-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-medium text-white/90">Participants</h2>
            <span className="text-sm text-white/40">5 of 5</span>
          </div>

          <div className="grid gap-3">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="p-3.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400/80 to-blue-500/80">
                      {participant.avatar_url && (
                        <img
                          src={participant.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    {participant.is_speaking && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#0c1220]" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white/90 text-sm">{participant.name}</h3>
                    <p className="text-xs text-white/50">{participant.role}</p>
                  </div>
                </div>

                <div className="mt-2.5 pl-[52px]">
                  <p className="text-xs text-white/70">
                    {participant.focus_task}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this to your global