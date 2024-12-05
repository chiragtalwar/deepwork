import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Icons } from '../ui/icons';
import { format } from 'date-fns';
import { useRoom } from '../../contexts/RoomContext';
import { useAuth } from '../../contexts/AuthContext';

interface Room {
  id: string;
  start_time: string;
  duration: number;
  max_participants: number;
  current_participants: number;
}

export function RoomScheduler({ filter }: { filter: 'upcoming' | 'hour' | 'half' }) {
  const navigate = useNavigate();
  const { joinRoom } = useRoom();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Generate time slots for today
    const now = new Date();
    const currentHour = now.getHours();
    const generatedRooms: Room[] = [];

    // Generate next 5 time slots
    for (let i = 0; i < 5; i++) {
      const startTime = new Date();
      startTime.setHours(currentHour + i, 0, 0, 0);

      const roomId = `${startTime.getFullYear()}-${startTime.getMonth() + 1}-${startTime.getDate()}-${currentHour + i}`;
      
      generatedRooms.push({
        id: roomId,
        start_time: startTime.toISOString(),
        duration: filter === 'half' ? 1800 : 3600,
        max_participants: 5,
        current_participants: Math.floor(Math.random() * 3)
      });
    }

    setRooms(generatedRooms);
    setIsLoading(false);
  }, [filter]);

  const handleJoinSession = async (roomId: string) => {
    console.log('Join session clicked for room:', roomId);
    
    if (user) {
      try {
        await joinRoom(roomId);
        console.log('Successfully joined room, navigating...');
        navigate(`/room/${roomId}`);
      } catch (error) {
        console.error('Failed to join room:', error);
      }
    } else {
      navigate(`/auth?redirect=${encodeURIComponent(`/room/${roomId}`)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rooms.map((room) => (
        <Card key={room.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">
                  {format(new Date(room.start_time), 'h:mm a')}
                </h3>
                <p className="text-muted-foreground">
                  {room.current_participants}/{room.max_participants} participants
                </p>
              </div>
              <Button 
                type="button"
                onClick={() => {
                  console.log('Button clicked');
                  handleJoinSession(room.id);
                }}
                disabled={room.current_participants >= room.max_participants}
                className="min-w-[120px]"
              >
                Join Session
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}