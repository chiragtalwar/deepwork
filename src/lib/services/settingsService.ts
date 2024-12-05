import { supabase } from '../supabase';

export interface UserSettings {
  id: string;
  user_id: string;
  notification_preferences: {
    email: boolean;
    push: boolean;
    sound: boolean;
  };
  session_preferences: {
    default_duration: number;
    auto_start_video: boolean;
    auto_start_audio: boolean;
  };
  theme_preferences: {
    dark_mode: boolean;
    color_scheme: string;
  };
}

export const settingsService = {
  async getUserSettings(): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async updateSettings(settings: Partial<UserSettings>) {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert(settings)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateNotificationPreferences(preferences: UserSettings['notification_preferences']) {
    return this.updateSettings({
      notification_preferences: preferences,
    });
  },

  async updateSessionPreferences(preferences: UserSettings['session_preferences']) {
    return this.updateSettings({
      session_preferences: preferences,
    });
  },

  async updateThemePreferences(preferences: UserSettings['theme_preferences']) {
    return this.updateSettings({
      theme_preferences: preferences,
    });
  },
}; 