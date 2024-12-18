import { supabase } from '../supabase';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  requirement_type: string;
  requirement_value: number;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  preview_url: string | null;
  requirement_type: string | null;
  requirement_value: number | null;
  css_variables: Record<string, string>;
}

export const rewardService = {
  async getUserBadges() {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getAvailableBadges() {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('requirement_value', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getUserThemes() {
    const { data, error } = await supabase
      .from('user_themes')
      .select(`
        *,
        theme:themes(*)
      `)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async setActiveTheme(themeId: string) {
    const { error } = await supabase.rpc('set_active_theme', {
      theme_id: themeId
    });

    if (error) throw error;
  },

  async checkAndAwardBadges() {
    const { error } = await supabase.rpc('check_and_award_badges');
    if (error) throw error;
  },

  async checkAndUnlockThemes() {
    const { error } = await supabase.rpc('check_and_unlock_themes');
    if (error) throw error;
  }
}; 