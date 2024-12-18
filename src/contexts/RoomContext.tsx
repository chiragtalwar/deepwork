import { roomService } from '@/lib/services/roomService';
import { websocketService } from '@/lib/services/websocketService';
import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface RoomContextState {
  currentRoom: string | null;
  isLoading: boolean;
  participants: Array<{
    id: string;
    userId: string;
    displayName: string;
  }>;
  duration: number;
  startTime: Date | null;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
}

// Define a default state
const defaultRoomState = {
  currentRoom: null,
  isLoading: false,
  participants: [],
  duration: 0,
  startTime: null
};

// Create context with undefined initial value
export const RoomContext = createContext<RoomContextState | undefined>(undefined);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<RoomContextState, 'joinRoom' | 'leaveRoom'>>(defaultRoomState);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const currentRoomId = useRef<string | null>(null);

  const handleRoomUpdate = useCallback((message: {
    type: 'user_joined' | 'user_left' | 'focus_changed' | 'timer_sync';
    payload: any;
  }) => {
    switch (message.type) {
      case 'user_joined':
        setState(prev => ({
          ...prev,
          participants: [...prev.participants, message.payload]
        }));
        break;
      
      case 'user_left':
        setState(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.userId !== message.payload.userId)
        }));
        break;

      case 'focus_changed':
        // Handle focus state changes when we implement that feature
        break;

      case 'timer_sync':
        // Handle timer synchronization
        break;
    }
  }, []);

  const joinRoom = async (roomId: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await roomService.joinRoom(roomId);
      console.log('Join room result:', result);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          currentRoom: roomId,
          duration: result.room?.duration || 3600,
          startTime: result.room?.start_time ? new Date(result.room.start_time) : new Date()
        }));
        
        // Store unsubscribe function
        unsubscribeRef.current = websocketService.subscribeToRoom(roomId, handleRoomUpdate);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error joining room:', error);
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const leaveRoom = async () => {
    try {
      if (currentRoomId.current) {
        await supabase
          .from('room_participants')
          .delete()
          .eq('room_id', currentRoomId.current);
        
        currentRoomId.current = null;
      }
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  const value = {
    ...state,
    joinRoom,
    leaveRoom
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}

export function useRoomContext() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoomContext must be used within a RoomProvider');
  }
  return context;
} 