import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserStats(userIds: string[]) {
  const [stats, setStats] = useState<Record<string, any>>({});
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userIds.length) return;

      try {
        // First check if the column exists
        const { data: columns, error: columnError } = await supabase
          .from('user_stats')
          .select()
          .limit(1);

        // If table/column doesn't exist, return default values
        if (columnError) {
          console.log('[STATS] Stats table not ready, using defaults');
          const defaultStats = userIds.reduce((acc, id) => ({
            ...acc,
            [id]: { weekly_focus_minutes: 0 }
          }), {});
          setStats(defaultStats);
          return;
        }

        // If table exists, fetch actual stats
        const { data, error } = await supabase
          .from('user_stats')
          .select('user_id, weekly_focus_minutes')
          .in('user_id', userIds);

        if (error) throw error;

        // Convert array to record and fill in missing users with 0
        const statsMap = (data || []).reduce((acc, stat) => ({
          ...acc,
          [stat.user_id]: stat
        }), {});

        // Ensure all requested users have stats
        const fullStats = userIds.reduce((acc, id) => ({
          ...acc,
          [id]: statsMap[id] || { weekly_focus_minutes: 0 }
        }), {});

        setStats(fullStats);
      } catch (err) {
        console.error('[STATS] Error fetching stats:', err);
        setError(err as Error);
        
        // Still provide default values on error
        const defaultStats = userIds.reduce((acc, id) => ({
          ...acc,
          [id]: { weekly_focus_minutes: 0 }
        }), {});
        setStats(defaultStats);
      }
    };

    fetchStats();
  }, [userIds]);

  return { stats, error };
} 