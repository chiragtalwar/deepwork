import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Icons } from '../ui/icons';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { roomService } from '../../lib/services/roomService';
import { supabase } from '../../lib/supabase';
import { toast } from '../ui/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

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
}

interface RoomSchedulerProps {
  filter?: string;
}

export function RoomScheduler({ filter }: RoomSchedulerProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processingRoomId, setProcessingRoomId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchRooms = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      
      const data = await roomService.getUpcomingRooms(filter as any);
      setRooms(data);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    // Create new subscription
    channelRef.current = supabase
      .channel('room-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_participants' },
        () => {
          console.log('Participants changed, refreshing...');
          fetchRooms();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_waitlist' },
        () => {
          console.log('Waitlist changed, refreshing...');
          fetchRooms();
        }
      )
      .subscribe();
  };

  useEffect(() => {
    let mounted = true;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted) {
        fetchRooms(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    fetchRooms(true);
    setupRealtimeSubscription();

    return () => {
      mounted = false;
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
          <div key={room.id} className="group bg-white/10 hover:bg-white/15 backdrop-blur-md 
            rounded-2xl p-6 transition-all duration-300 border border-white/10 hover:border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-3xl font-light text-white/90">
                    {format(new Date(room.start_time), 'h:mm a')}
                  </h3>
                  <span className={`text-lg font-light px-3 py-0.5 rounded-full 
                    ${timeInfo.isStarting 
                      ? 'bg-emerald-400/20 text-emerald-300' 
                      : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {timeInfo.text}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mt-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Icons.user className="h-4 w-4 text-white/60" />
                    <span className="font-light text-white/60">{room.current_participants}/{room.max_participants} Members</span>
                  </div>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-2 text-white/60">
                    <Icons.clock className="h-4 w-4 text-white/60" />
                    <span className="font-light text-white/60">{room.duration / 60} Minutes</span>
                  </div>
                </div>

                {status === 'waitlist' && room.room_waitlist && (
                  <div className="flex items-center gap-2 text-white/60">
                    <Icons.clock className="h-4 w-4" />
                    <span className="font-light">
                      {room.room_waitlist.length} in waitlist
                    </span>
                  </div>
                )}
              </div>
              
              {getRoomButton(room, status)}
            </div>

            {/* Participant + Waitlist Avatars */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {room.participants?.map((p) => (
                  <div key={p.id} className="w-8 h-8 rounded-full border-2 border-white/10 overflow-hidden">
                    {p.avatar_url ? (
                      <img 
                        src={p.avatar_url} 
                        alt={p.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/60">
                        {(p.full_name ?? 'U')[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {status === 'waitlist' && room.room_waitlist && room.room_waitlist.length > 0 && (
                <>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex -space-x-2">
                    {room.room_waitlist.map((p) => (
                      <div key={p.id} 
                        className="w-8 h-8 rounded-full border-2 border-white/10 overflow-hidden opacity-60">
                        {p.profiles?.avatar_url ? (
                          <img 
                            src={p.profiles.avatar_url} 
                            alt={p.profiles.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/60">
                            {(p.profiles?.full_name ?? 'U')[0]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mt-6 bg-white/[0.08] rounded-full h-[2px]">
              <div 
                className={`h-full rounded-full transition-all duration-500
                  ${timeInfo.isStarting ? 'bg-emerald-400/40' : 'bg-white/30'}`}
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