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
        
        // If table exists, fetch actual stats
        const { data, error } = await supabase
          .from('user_stats')
          .select('user_id, weekly_focus_minutes, total_sessions, current_streak, last_session_date')
          .in('user_id', userIds);

        if (error) throw error;

        console.log('[STATS] Received stats:', data);

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

        if (mounted) {
          console.log('[STATS] Setting stats:', fullStats);
          setStats(fullStats);
        }
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

    // Create individual subscriptions for each user
    const subscriptions = userIds.map(userId => 
      supabase
        .channel(`user_stats_${userId}`)
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'user_stats',
            filter: `user_id=eq.${userId}`,
          },
          async (payload: any) => {
            console.log(`[STATS] Stats changed for user ${userId}:`, payload);
            
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
        .subscribe()
    );

    // Also subscribe to room_participants changes to catch new participants
    const participantsSubscription = supabase
      .channel('room_participants_stats')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants'
        },
        async () => {
          // Refetch all stats when participants change
          await fetchStats();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      // Cleanup all subscriptions
      subscriptions.forEach(subscription => subscription.unsubscribe());
      participantsSubscription.unsubscribe();
    };
  }, [userIds.join(',')]); // Dependency on stringified userIds to avoid infinite loops

  return { stats, error };
} 