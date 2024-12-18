import { supabase } from '../supabase';

export interface SessionStats {
  totalSessions: number;
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
}

export interface Session {
  id: string;
  start_time: string;
  end_time: string;
  duration: number;
}

export const progressService = {
  async startSession(roomId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        room_id: roomId,
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async endSession(sessionId: string, duration: number) {
    const { data, error } = await supabase
      .from('sessions')
      .update({
        end_time: new Date().toISOString(),
        duration,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getStats(): Promise<SessionStats> {
    const { data: stats, error } = await supabase
      .rpc('get_user_stats');

    if (error) throw error;
    return stats;
  },

  async getRecentSessions(limit = 10): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },
}; 