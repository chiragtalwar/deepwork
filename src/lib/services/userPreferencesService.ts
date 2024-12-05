import { supabase } from '../supabase';

export interface UserPreferences {
  theme_id: string;
  notifications_enabled: boolean;
  session_duration_preference: number;
}

export const userPreferencesService = {
  async getUserPreferences() {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async updateUserPreferences(preferences: Partial<UserPreferences>) {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(preferences)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async setNotificationsEnabled(enabled: boolean) {
    return this.updateUserPreferences({ notifications_enabled: enabled });
  },

  async setSessionDurationPreference(duration: number) {
    return this.updateUserPreferences({ session_duration_preference: duration });
  }
}; 