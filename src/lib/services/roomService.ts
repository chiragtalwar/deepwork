import { supabase } from '../supabase';

export type RoomType = 'FOCUS' | 'SPRINT';
export type RoomTheme = 'DEEP_WORK' | 'CREATIVE_FLOW' | 'STUDY_HALL';

interface RoomData {
  name: string;
  start_time: string;
  duration: number;
  max_participants: number;
  active: boolean;
  current_participants: number;
  room_type: RoomType;
  theme: RoomTheme;
}

export const ROOM_CONFIG = {
  types: {
    FOCUS: {
      durations: [50, 90],
      name: "Focus Session"
    },
    SPRINT: {
      durations: [25],
      name: "Sprint Session"
    }
  },
  themes: {
    DEEP_WORK: {
      name: "Deep Work",
      description: "For focused, distraction-free work"
    },
    CREATIVE_FLOW: {
      name: "Creative Flow",
      description: "For creative tasks and brainstorming"
    },
    STUDY_HALL: {
      name: "Study Hall",
      description: "For learning and academic focus"
    }
  },
  maxParticipants: 5
};

export const roomService = {
  async createRoom(roomData: RoomData) {
    const { data, error } = await supabase
      .from('rooms')
      .insert([roomData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUpcomingRooms(filter?: string, limit = 10) {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let query = supabase
      .from('rooms')
      .select(`
        *,
        room_participants(
          user_id
        ),
        room_waitlist(
          id,
          user_id,
          joined_at
        )
      `)
      .eq('active', true)
      .gte('start_time', now.toISOString())
      .order('start_time', { ascending: true });

    // Apply room type filter if specified
    if (filter === 'hour') {
      query = query.eq('room_type', 'FOCUS');
    } else if (filter === 'half') {
      query = query.eq('room_type', 'SPRINT');
    } else {
      query = query.lte('start_time', twentyFourHoursLater.toISOString());
    }

    const { data: rooms, error } = await query.limit(limit);

    if (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }

    // If we have rooms, get profiles for both participants and waitlist
    if (rooms?.length) {
      const userIds = [...new Set([
        ...rooms.flatMap(room => room.room_participants?.map(p => p.user_id) || []),
        ...rooms.flatMap(room => room.room_waitlist?.map(w => w.user_id) || [])
      ])];

      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url, full_name')
          .in('id', userIds);

        return rooms.map(room => ({
          ...room,
          participants: room.room_participants?.map(rp => {
            const profile = profiles?.find(p => p.id === rp.user_id);
            return {
              id: rp.user_id,
              avatar_url: profile?.avatar_url || '',
              full_name: profile?.full_name || ''
            };
          }) || [],
          room_waitlist: room.room_waitlist?.map(rw => {
            const profile = profiles?.find(p => p.id === rw.user_id);
            return {
              id: rw.id,
              user_id: rw.user_id,
              profiles: {
                avatar_url: profile?.avatar_url || '',
                full_name: profile?.full_name || ''
              }
            };
          }) || []
        }));
      }
    }

    return rooms || [];
  },

  async createNextTimeSlotRooms(startTime: Date) {
    const newRooms: RoomData[] = [];
    const minutes = startTime.getMinutes();
    
    // For start of hour (0 minutes): Create both FOCUS and SPRINT rooms
    if (minutes === 0) {
      // Create FOCUS room
      const focusTheme = Object.keys(ROOM_CONFIG.themes)[Math.floor(Math.random() * Object.keys(ROOM_CONFIG.themes).length)];
      newRooms.push({
        name: `${ROOM_CONFIG.themes[focusTheme].name} - Focus`,
        start_time: startTime.toISOString(),
        duration: ROOM_CONFIG.types.FOCUS.durations[0], // 50 min
        max_participants: ROOM_CONFIG.maxParticipants,
        current_participants: 0,
        active: true,
        room_type: 'FOCUS',
        theme: focusTheme as RoomTheme
      });
    }

    // For both start of hour (0 minutes) and half hour (30 minutes): Create SPRINT room
    if (minutes === 0 || minutes === 30) {
      // Create SPRINT room
      const sprintTheme = Object.keys(ROOM_CONFIG.themes)[Math.floor(Math.random() * Object.keys(ROOM_CONFIG.themes).length)];
      newRooms.push({
        name: `${ROOM_CONFIG.themes[sprintTheme].name} - Sprint`,
        start_time: startTime.toISOString(),
        duration: ROOM_CONFIG.types.SPRINT.durations[0], // 25 min
        max_participants: ROOM_CONFIG.maxParticipants,
        current_participants: 0,
        active: true,
        room_type: 'SPRINT',
        theme: sprintTheme as RoomTheme
      });
    }

    if (newRooms.length > 0) {
      const { data, error } = await supabase
        .from('rooms')
        .insert(newRooms)
        .select();

      if (error) throw error;
      return data;
    }
    
    return null;
  },

  async initializeUpcomingRooms() {
    const now = new Date();
    const upcoming: Date[] = [];

    // Create rooms for next 3 hours
    for (let i = 1; i <= 3; i++) {
      // Add full hour slot
      const hourSlot = new Date(now);
      hourSlot.setHours(hourSlot.getHours() + i, 0, 0, 0);
      upcoming.push(hourSlot);

      // Add half-hour slot
      const halfHourSlot = new Date(now);
      halfHourSlot.setHours(halfHourSlot.getHours() + i, 30, 0, 0);
      upcoming.push(halfHourSlot);
    }

    // Sort timestamps to ensure proper ordering
    upcoming.sort((a, b) => a.getTime() - b.getTime());

    // Create rooms for each time slot
    for (const startTime of upcoming) {
      await this.createNextTimeSlotRooms(startTime);
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

  async joinRoom(roomId: string) {
    const { data, error } = await supabase
      .rpc('join_room_v2', {
        _room_id: roomId
      });

    if (error) throw error;
    return data;
  },

  async leaveRoom(roomId: string) {
    const { data, error } = await supabase
      .rpc('leave_room', {
        room_id: roomId,
      });

    if (error) throw error;
    return data;
  },

  async joinWaitlist(roomId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get room details first
      const { data: room } = await supabase
        .from('rooms')
        .select('start_time, room_type')
        .eq('id', roomId)
        .single();

      if (room) {
        // Check if we need to add a new room
        await this.addRoomIfNeeded(room.start_time, room.room_type);
      }

      const { error } = await supabase
        .from('room_waitlist')
        .insert({
          room_id: roomId,
          user_id: user.id,
          joined_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Join waitlist error:', err);
      throw err;
    }
  },

  async addRoomIfNeeded(startTime: string, roomType: RoomType) {
    // Check if rooms for this time slot are near capacity
    const { data: rooms } = await supabase
      .from('rooms')
      .select('current_participants, max_participants')
      .eq('start_time', startTime)
      .eq('room_type', roomType)
      .eq('active', true);

    // If all rooms are over 80% capacity, create a new one
    const isNearCapacity = rooms?.every(
      room => (room.current_participants / room.max_participants) > 0.8
    );

    if (isNearCapacity) {
      // Create an additional room with same start time
      const theme = Object.keys(ROOM_CONFIG.themes)[Math.floor(Math.random() * Object.keys(ROOM_CONFIG.themes).length)];
      const newRoom: RoomData = {
        name: `${ROOM_CONFIG.themes[theme].name} - ${roomType === 'FOCUS' ? 'Focus' : 'Sprint'}`,
        start_time: startTime,
        duration: roomType === 'FOCUS' ? ROOM_CONFIG.types.FOCUS.durations[0] : ROOM_CONFIG.types.SPRINT.durations[0],
        max_participants: ROOM_CONFIG.maxParticipants,
        current_participants: 0,
        active: true,
        room_type: roomType,
        theme: theme as RoomTheme
      };

      await supabase.from('rooms').insert([newRoom]);
    }
  }
}; 