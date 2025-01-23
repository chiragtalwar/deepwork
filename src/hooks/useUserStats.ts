import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserStats(userIds: string[]) {
  const [stats, setStats] = useState<Record<string, any>>({});
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

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
          if (mounted) setStats(defaultStats);
          return;
        }

        // If table exists, fetch actual stats
        const { data, error } = await supabase
          .from('user_stats')
          .select('user_id, weekly_focus_minutes, total_sessions, current_streak, last_session_date')
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
          [id]: statsMap[id] || { 
            weekly_focus_minutes: 0,
            total_sessions: 0,
            current_streak: 0,
            last_session_date: null
          }
        }), {});

        if (mounted) setStats(fullStats);
      } catch (err) {
        console.error('[STATS] Error fetching stats:', err);
        if (mounted) setError(err as Error);
        
        // Still provide default values on error
        const defaultStats = userIds.reduce((acc, id) => ({
          ...acc,
          [id]: { 
            weekly_focus_minutes: 0,
            total_sessions: 0,
            current_streak: 0,
            last_session_date: null
          }
        }), {});
        if (mounted) setStats(defaultStats);
      }
    };

    // Initial fetch
    fetchStats();

    // Subscribe to changes
    const subscription = supabase
      .channel('user_stats_changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=in.(${userIds.join(',')})`,
        },
        async (payload: any) => {
          console.log('[STATS] Stats changed:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new;
            if (mounted) {
              setStats(prev => ({
                ...prev,
                [newData.user_id]: newData
              }));
            }
          } else {
            // For other events or to ensure consistency, refetch all stats
            await fetchStats();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [userIds.join(',')]); // Dependency on stringified userIds to avoid infinite loops

  return { stats, error };
} 