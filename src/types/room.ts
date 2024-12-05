import { User } from '@supabase/supabase-js'

export interface RoomParticipant {
  id: string;
  userId: string;
  roomId: string;
  joinedAt: Date;
  displayName: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export interface Room {
  id: string;
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  participants: RoomParticipant[];
  isActive: boolean;
}

export type RoomFilter = 'upcoming' | 'hour' | 'half'; 