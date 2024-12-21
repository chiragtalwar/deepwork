import { supabase } from '../supabase';

interface RoomData {
  name: string;
  start_time: string;
  duration: number;
  max_participants: number;
  active: boolean;
  current_participants: number;
}

export interface Room extends RoomData {
  id: string;
}

export const roomService = {
  async createRoom(roomData: RoomData) {
    const { data, error } = await supabase
      .from('rooms')
      .insert([roomData] as RoomData[]);

    if (error) throw error;
    return data;
  },

  async getUpcomingRooms(filter?: 'upcoming' | 'hour' | 'half', limit: number = 10): Promise<Room[]> {
    let query = supabase
      .from('rooms')
      .select(`
        *,
        room_waitlist (
          id,
          user_id
        )
      `)
      .gte('start_time', new Date().toISOString())
      .eq('active', true)
      .order('start_time', { ascending: true });

    // Apply duration filter
    if (filter === 'hour') {
      query = query.eq('duration', 3600);
    } else if (filter === 'half') {
      query = query.eq('duration', 1800);
    }

    // Add time window constraint for 'upcoming' filter
    if (filter === 'upcoming') {
      const twentyFourHoursLater = new Date();
      twentyFourHoursLater.setHours(new Date().getHours() + 24);
      query = query.lte('start_time', twentyFourHoursLater.toISOString());
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }

    // If no rooms exist, create some test rooms
    if (!data || data.length === 0) {
      console.log('No rooms found, creating test rooms...');
      await this.createInitialRooms();
      return this.getUpcomingRooms(filter); // Retry after creating rooms
    }

    return data;
  },

  async joinRoom(roomId: string) {
    const { data, error } = await supabase
        .rpc('join_room_v2', {
            _room_id: roomId
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

  async createInitialRooms() {
    const now = new Date();
    const rooms: RoomData[] = [];

    // Create rooms for the next 5 hours
    for (let i = 0; i < 5; i++) {
      const startTime = new Date(now);
      startTime.setHours(now.getHours() + i, 0, 0, 0);
      
      rooms.push({
        name: `Focus Room ${i + 1}`,
        start_time: startTime.toISOString(),
        duration: 3600,
        max_participants: 5,
        active: true,
        current_participants: 0
      });
    }

    const { error } = await supabase.from('rooms').insert(rooms);
    if (error) throw error;
  },

  async joinWaitlist(roomId: string) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Join waitlist - simplified query
      const { error } = await supabase
        .from('room_waitlist')
        .insert({
          room_id: roomId,
          user_id: user.id,
          joined_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Waitlist join error:', error);
        throw error;
      }

      // Return true for success
      return true;
    } catch (err) {
      console.error('Join waitlist error:', err);
      throw err;
    }
  },

  async leaveWaitlist(roomId: string) {
    const { error } = await supabase
      .from('room_waitlist')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    if (error) throw error;
  },

  async updateRoom(id: string, roomData: RoomData) {
    const { data, error } = await supabase
      .from('rooms')
      .update(roomData)
      .eq('id', id);

    if (error) throw error;
    return data;
  }
}; 