import { supabase } from '../supabase';

export interface Room {
  id: string;
  start_time: string;
  duration: number;
  max_participants: number;
  active: boolean;
  current_participants: number;
}

export const roomService = {
  async createRoom(startTime: Date, duration: number) {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        start_time: startTime.toISOString(),
        duration,
        max_participants: 5,
        active: true,
        current_participants: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUpcomingRooms() {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(10);

    if (error) throw error;
    return data;
  },

  async joinRoom(roomId: string) {
    const { data, error } = await supabase.rpc('join_room', {
      room_id: roomId,
    });

    if (error) throw error;
    return data;
  },

  async leaveRoom(roomId: string) {
    const { data, error } = await supabase.rpc('leave_room', {
      room_id: roomId,
    });

    if (error) throw error;
    return data;
  },
}; 