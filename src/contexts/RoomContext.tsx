import React, { createContext, useContext, useState } from 'react';

interface RoomContextType {
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  isLoading: boolean;
  currentRoom: string | null;
  toggleFocus: () => void;
  isFocused: boolean;
}

export const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const joinRoom = async (roomId: string) => {
    try {
      setIsLoading(true);
      setCurrentRoom(roomId);
      return Promise.resolve();
    } finally {
      setIsLoading(false);
    }
  };

  const leaveRoom = async () => {
    try {
      setIsLoading(true);
      setCurrentRoom(null);
      setIsFocused(false);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFocus = () => setIsFocused(prev => !prev);

  return (
    <RoomContext.Provider value={{
      joinRoom,
      leaveRoom,
      isLoading,
      currentRoom,
      toggleFocus,
      isFocused
    }}>
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