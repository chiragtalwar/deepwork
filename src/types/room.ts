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
  start_time: string;
  duration: number;
  max_participants: number;
  current_participants: number;
  active: boolean;
  participants?: {
    id: string;
    avatar_url: string;
    full_name: string;
  }[];
  waitlist?: {
    id: string;
    avatar_url: string;
    full_name: string;
  }[];
}

export type RoomFilter = 'upcoming' | 'hour' | 'half'; 