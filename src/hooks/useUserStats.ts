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
        console.log('[STATS] Fetching stats for users:', userIds);
        
        // Fetch all stats in one query
        const { data, error } = await supabase
          .from('user_stats')
          .select('*')
          .in('user_id', userIds);

        if (error) throw error;

        console.log('[STATS] Received stats:', data);

        // Convert array to record and fill in missing users with 0
        const statsMap = userIds.reduce((acc, id) => {
          const userStat = data?.find(stat => stat.user_id === id);
          acc[id] = userStat || {
            user_id: id,
            weekly_focus_minutes: 0,
            total_sessions: 0,
            current_streak: 0,
            last_session_date: null
          };
          return acc;
        }, {} as Record<string, any>);

        if (mounted) {
          console.log('[STATS] Setting stats:', statsMap);
          setStats(statsMap);
        }
      } catch (err) {
        console.error('[STATS] Error fetching stats:', err);
        if (mounted) setError(err as Error);
      }
    };

    // Initial fetch
    fetchStats();

    // Set up real-time subscription for ALL users
    const subscription = supabase
      .channel('user_stats_changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=in.(${userIds.map(id => `'${id}'`).join(',')})`,
        },
        async (payload: any) => {
          console.log(`[STATS] Stats changed:`, payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new;
            if (mounted) {
              setStats(prev => ({
                ...prev,
                [newData.user_id]: newData
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [userIds.join(',')]); // Only rerun if the list of userIds changes

  return { stats, error };
} 