import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserStats(userIds: string[]) {
  const [stats, setStats] = useState<Record<string, { total_focus_minutes: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userIds.length) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('user_stats')
          .select('user_id, total_focus_minutes')
          .in('user_id', userIds);

        if (fetchError) throw fetchError;

        const statsMap = data?.reduce((acc, stat) => ({
          ...acc,
          [stat.user_id]: {
            total_focus_minutes: stat.total_focus_minutes || 0
          }
        }), {});

        setStats(statsMap || {});
      } catch (err) {
        console.error('[STATS] Error fetching user stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userIds.join(',')]);

  return { stats, loading, error };
} 