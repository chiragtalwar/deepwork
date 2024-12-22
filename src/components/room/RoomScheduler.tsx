import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Icons } from '../ui/icons';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { roomService, ROOM_CONFIG } from '../../lib/services/roomService';
import { supabase } from '../../lib/supabase';
import { toast } from '../ui/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useLoadingState } from '../../hooks/useLoadingState';

interface Room {
  id: string;
  start_time: string;
  duration: number;
  max_participants: number;
  current_participants: number;
  active: boolean;
  participants?: {
    id: string;
    avatar_url?: string;
    full_name?: string;
  }[];
  room_waitlist?: {
    id: string;
    user_id: string;
    profiles?: {
      avatar_url?: string;
      full_name?: string;
    };
  }[];
  theme: string;
  room_type: string;
}

interface RoomSchedulerProps {
  filter?: string;
}

export function RoomScheduler({ filter }: RoomSchedulerProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const { isLoading, withLoading, hasInitialData } = useLoadingState();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processingRoomId, setProcessingRoomId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mounted = useRef(true);

  const fetchRooms = async () => {
    if (!mounted.current) return;
    
    await withLoading(async () => {
      const data = await roomService.getUpcomingRooms(filter as any);
      
      // If no rooms exist, initialize them
      if (!data || data.length === 0) {
        console.log('No rooms found, initializing...');
        await roomService.initializeUpcomingRooms();
        const newData = await roomService.getUpcomingRooms(filter as any);
        if (mounted.current) {
          setRooms(newData || []);
        }
      } else if (mounted.current) {
        setRooms(data);
      }
    }, !hasInitialData());
  };

  const setupRealtimeSubscription = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    channelRef.current = supabase
      .channel('room-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_participants' },
        () => {
          if (!isLoading) {
            fetchRooms();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_waitlist' },
        () => {
          if (!isLoading) {
            fetchRooms();
          }
        }
      )
      .subscribe();
  };

  useEffect(() => {
    mounted.current = true;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted.current) {
        fetchRooms();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    fetchRooms();
    setupRealtimeSubscription();

    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channelRef.current?.unsubscribe();
    };
  }, [filter]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Icons.spinner className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60">No sessions available at the moment.</p>
      </div>
    );
  }

  const getTimeDisplay = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const diffMinutes = Math.round((start.getTime() - now.getTime()) / 60000);
    
    if (diffMinutes <= 0) return { text: 'Starting now', isStarting: true };
    if (diffMinutes <= 60) return { text: `Starting in ${diffMinutes}m`, isStarting: false };
    return { text: format(start, 'h:mm a'), isStarting: false };
  };

  const getRoomStatus = (room: Room) => {
    const now = new Date();
    const start = new Date(room.start_time);
    const diffMinutes = Math.round((start.getTime() - now.getTime()) / 60000);
    
    // Room is full
    if (room.current_participants >= room.max_participants) return 'full';
    
    // Within 5 minutes of start time
    if (diffMinutes <= 5) {
      // Check if user is in waitlist
      const isInWaitlist = room.room_waitlist?.some(w => w.user_id === user?.id);
      if (isInWaitlist) return 'joinable';
      
      // If not in waitlist, check if there's space
      if (room.current_participants < room.max_participants) return 'joinable';
      return 'full';
    }
    
    // More than 5 minutes before start
    return 'waitlist';
  };

  const isInWaitlist = (room: Room) => {
    return room.room_waitlist?.some(
      (waitlist) => waitlist.user_id === user?.id
    );
  };

  const handleRoomAction = async (roomId: string, status: string, isReserved: boolean) => {
    try {
      // Check if user is authenticated first
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to reserve a spot or join a session.",
          variant: "destructive"
        });
        return;
      }

      setProcessingRoomId(roomId);
      
      if (status === 'joinable') {
        // Only allow joining if user is in waitlist or room has space
        const room = rooms.find(r => r.id === roomId);
        if (!room) throw new Error('Room not found');
        
        const isInWaitlist = room.room_waitlist?.some(w => w.user_id === user?.id);
        if (!isInWaitlist && room.current_participants >= room.max_participants) {
          toast({
            title: "Room is full",
            description: "Please join the waitlist for upcoming sessions.",
            variant: "destructive"
          });
          return;
        }
        
        // If in waitlist, remove from waitlist before joining
        if (isInWaitlist) {
          await roomService.leaveWaitlist(roomId);
        }
        
        // Join the room
        await roomService.joinRoom(roomId);
        navigate(`/room/${roomId}`);
        return;
      }
      
      if (status === 'waitlist') {
        if (isReserved) {
          await roomService.leaveWaitlist(roomId);
          
          // Update local state immediately
          setRooms(prevRooms => prevRooms.map(room => {
            if (room.id === roomId) {
              return {
                ...room,
                room_waitlist: room.room_waitlist?.filter(w => w.user_id !== user?.id)
              };
            }
            return room;
          }));

          toast({
            title: "Spot Released",
            description: "You've been removed from the waitlist."
          });
        } else {
          await roomService.joinWaitlist(roomId);
          
          // Update local state immediately
          setRooms(prevRooms => prevRooms.map(room => {
            if (room.id === roomId) {
              return {
                ...room,
                room_waitlist: [...(room.room_waitlist || []), {
                  id: crypto.randomUUID(), // temporary ID
                  user_id: user?.id!,
                  profiles: {
                    avatar_url: user?.user_metadata?.avatar_url,
                    full_name: user?.user_metadata?.full_name
                  }
                }]
              };
            }
            return room;
          }));

          toast({
            title: "Spot Reserved!",
            description: "You'll be notified when it's time to join."
          });
        }
      }
    } catch (err) {
      console.error('Action error:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: "destructive"
      });
    } finally {
      setProcessingRoomId(null);
    }
  };

  const getRoomButton = (room: Room, status: string) => {
    const isReserved = room.room_waitlist?.some(w => w.user_id === user?.id) ?? false;
    const isProcessing = processingRoomId === room.id;
    const now = new Date();
    const start = new Date(room.start_time);
    const diffMinutes = Math.round((start.getTime() - now.getTime()) / 60000);

    // Within 5 minutes of start and user is in waitlist
    if (diffMinutes <= 5 && isReserved) {
      return (
        <Button
          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
          onClick={() => handleRoomAction(room.id, 'joinable', true)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Join Session
        </Button>
      );
    }

    // Regular states
    if (status === 'waitlist') {
      return (
        <Button
          className={isReserved ? 
            "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300" : 
            "bg-white/10 hover:bg-white/20"}
          onClick={() => handleRoomAction(room.id, 'waitlist', isReserved)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {isReserved ? "Reserved (Click to Cancel)" : "Reserve Spot"}
        </Button>
      );
    }

    if (status === 'joinable' && !isReserved) {
      return (
        <Button
          className="bg-white/10 hover:bg-white/20"
          onClick={() => handleRoomAction(room.id, 'joinable', false)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Join Session
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {rooms.map((room) => {
        const timeInfo = getTimeDisplay(room.start_time);
        const status = getRoomStatus(room);
        const isReserved = isInWaitlist(room);
        
        return (
          <div key={room.id} 
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-lg 
              rounded-2xl p-6 transition-all duration-300 border border-white/20 
              hover:border-white/30 shadow-lg hover:shadow-xl">
            {/* Main Content */}
            <div className="flex justify-between items-start">
              {/* Left Side */}
              <div className="flex gap-4">
                {/* Theme Icon & Info */}
                <div className={`p-3.5 rounded-xl ${
                  room.theme === 'DEEP_WORK' ? 'bg-blue-500/20 text-blue-200' :
                  room.theme === 'CREATIVE_FLOW' ? 'bg-purple-500/20 text-purple-200' :
                  'bg-emerald-500/20 text-emerald-200'
                }`}>
                  <Icons.brain className="h-6 w-6" />
                </div>

                {/* Session Info */}
                <div>
                  <h3 className="text-2xl font-medium text-white mb-1">
                    {ROOM_CONFIG.themes[room.theme].name}
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3 text-base">
                      <span className="text-white/70 font-medium">
                        {room.duration} min {room.room_type === 'FOCUS' ? 'Focus' : 'Sprint'}
                      </span>
                      <span className="text-white/40">•</span>
                      <span className="text-white/70">
                        {room.current_participants}/{room.max_participants} joined
                      </span>
                      {room.room_waitlist && room.room_waitlist.length > 0 && (
                        <>
                          <span className="text-white/40">•</span>
                          <span className="text-white/70">
                            {room.room_waitlist.length} in waitlist
                          </span>
                        </>
                      )}
                    </div>
                    <p className={`text-sm ${
                      room.theme === 'DEEP_WORK' ? 'text-blue-200/70' :
                      room.theme === 'CREATIVE_FLOW' ? 'text-purple-200/70' :
                      'text-emerald-200/70'
                    }`}>
                      {room.theme === 'DEEP_WORK' && "Distraction-free zone for deep concentration"}
                      {room.theme === 'CREATIVE_FLOW' && "Perfect space for creative thinking & brainstorming"}
                      {room.theme === 'STUDY_HALL' && "Quiet environment for focused learning"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Side */}
              <div className="text-right">
                <div className="text-2xl font-medium text-white mb-1">
                  {format(new Date(room.start_time), 'h:mm a')}
                </div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium
                  ${timeInfo.isStarting 
                    ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30' 
                    : 'bg-white/10 text-white/70'}`}>
                  {timeInfo.text}
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-6 flex items-center justify-between">
              {/* Participants */}
              <div className="flex -space-x-3">
                {room.participants?.map((p) => (
                  <div key={p.id} 
                    className="w-8 h-8 rounded-full ring-2 ring-white/10 overflow-hidden
                      hover:z-10 transition-all duration-300 hover:ring-white/30">
                    {p.avatar_url ? (
                      <img 
                        src={p.avatar_url} 
                        alt={p.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center">
                        <span className="text-white/70 text-sm font-medium">
                          {(p.full_name ?? 'U')[0]}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div>
                {getRoomButton(room, status)}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  timeInfo.isStarting 
                    ? 'bg-emerald-400' 
                    : room.theme === 'DEEP_WORK' ? 'bg-blue-400' :
                      room.theme === 'CREATIVE_FLOW' ? 'bg-purple-400' :
                      'bg-emerald-400'
                }`}
                style={{ 
                  width: `${(room.current_participants / room.max_participants) * 100}%` 
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}