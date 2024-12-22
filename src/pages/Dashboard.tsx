import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Icons } from '../components/ui/icons';
import { Progress } from '../components/ui/progress';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLoadingState } from '../hooks/useLoadingState';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Session {
  id: string;
  user_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  duration: number;
  created_at: string;
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const { isLoading, withLoading, hasInitialData } = useLoadingState();
  const { user } = useAuth();
  const mounted = useRef(true);
  const navigate = useNavigate();

  const fetchSessions = async () => {
    if (!user || !mounted.current) return;
    
    await withLoading(async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (mounted.current && data) {
        setSessions(data);
      }
    }, !hasInitialData());
  };

  useEffect(() => {
    mounted.current = true;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted.current && !isLoading) {
        fetchSessions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    fetchSessions();

    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const calculateWeeklyFocusTime = () => {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);

    return sessions
      .filter(session => new Date(session.start_time) >= weekStart)
      .reduce((total, session) => total + (session.duration || 0), 0);
  };

  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sessionDays = new Set(
      sessions.map(session => 
        new Date(session.start_time).toISOString().split('T')[0]
      )
    );

    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (sessionDays.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const processContributionData = () => {
    const contributionMap = new Map();
    
    // Initialize last 52 weeks (1 year) with 0 sessions
    for (let i = 0; i < 52 * 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      contributionMap.set(dateStr, 0);
    }

    // Count sessions per day
    sessions.forEach(session => {
      const dateStr = new Date(session.start_time).toISOString().split('T')[0];
      if (contributionMap.has(dateStr)) {
        contributionMap.set(dateStr, contributionMap.get(dateStr) + 1);
      }
    });

    return Array.from(contributionMap.entries()).map(([date, count]) => ({
      date,
      sessions: count
    })).reverse(); // Reverse to show oldest to newest
  };

  const getContributionColor = (sessions: number) => {
    if (sessions === 0) return 'bg-gray-100';
    if (sessions === 1) return 'bg-purple-200';
    if (sessions === 2) return 'bg-purple-400';
    return 'bg-purple-600';
  };

  const contributionData = processContributionData();
  const weeklyHours = Math.round(calculateWeeklyFocusTime() / 3600); // Convert seconds to hours
  const currentStreak = calculateStreak();

  const calculateWeeklyProgress = () => {
    const weeklyGoal = 10; // 10 hours per week goal
    const progress = (weeklyHours / weeklyGoal) * 100;
    return Math.min(progress, 100);
  };

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your streak today!";
    if (streak < 3) return "You're building momentum!";
    if (streak < 7) return "You're on fire! 🔥";
    return "Unstoppable! 🚀";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#a5b9c5] via-[#8da3b0] to-[#6b8795]">
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10 animate-gradient" />
        <div className="relative container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/40" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#a5b9c5] via-[#8da3b0] to-[#6b8795]">
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10 animate-gradient" />

      <div className="relative container mx-auto px-4 py-8 pt-24">

        <div className="flex items-center justify-between mb-12">
          <div className="relative">
            <h1 className="text-6xl font-light tracking-tight text-white mb-3 animate-fade-in">
              Your Progress
            </h1>
            <p className="text-white/80 text-xl font-light animate-fade-in-delay">
              Track your deep work journey
            </p>
          </div>
          <div className="px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300">
            <span className="text-white/80 text-sm font-medium">
              Last updated: {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="group relative overflow-hidden rounded-2xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-[#2a3f4c]/50">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <Icons.clock className="h-5 w-5 text-white/90" />
                <span className="text-white/90 text-lg font-medium">Focus Time</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-5xl font-light text-white">
                    {weeklyHours}h
                    <span className="text-base text-white/60 ml-2">this week</span>
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Weekly Goal: 10h</span>
                    <span className="text-white/90">{calculateWeeklyProgress()}%</span>
                  </div>
                  <div className="relative h-2 bg-black/20 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/40 to-white/60 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${calculateWeeklyProgress()}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-[#2a3f4c]/50">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <Icons.flame className="h-5 w-5 text-orange-400" />
                <span className="text-white/90 text-lg font-medium">Current Streak</span>
              </div>
              
              <div className="space-y-3">
                <p className="text-5xl font-light text-white">{currentStreak}</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                  <p className="text-white/70 text-sm">
                    {getStreakMessage(currentStreak)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-[#2a3f4c]/50">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <Icons.target className="h-5 w-5 text-emerald-400" />
                <span className="text-white/90 text-lg font-medium">Total Sessions</span>
              </div>
              
              <div className="space-y-3">
                <p className="text-5xl font-light text-white">{sessions.length}</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <p className="text-white/70 text-sm">Lifetime focus sessions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 p-6 mb-8 overflow-x-auto">
          <h2 className="text-2xl font-light text-white mb-6 flex items-center gap-3">
            <Icons.activity className="h-5 w-5 text-white/90" />
            Deep Work Contributions
          </h2>
          <div className="min-w-[800px]">
            <div className="flex text-sm text-white/60 justify-between px-2 mb-2">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div className="grid grid-flow-col gap-1">
              {Array.from({ length: 52 }).map((_, week) => (
                <div key={week} className="grid grid-rows-7 gap-1">
                  {Array.from({ length: 7 }).map((_, day) => {
                    const dataIndex = week * 7 + day;
                    const dayData = contributionData[dataIndex];
                    return (
                      <div
                        key={day}
                        className={`w-3 h-3 rounded-sm transition-colors hover:ring-2 hover:ring-offset-1 hover:ring-white/30 ${getContributionColor(
                          dayData?.sessions || 0
                        )}`}
                        title={`${dayData?.date}: ${dayData?.sessions || 0} sessions`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-8">
            <h2 className="text-2xl font-light text-white mb-6">Weekly Focus Hours</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contributionData.slice(-7)}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value) => [`${value} sessions`]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sessions" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-8">
            <h2 className="text-2xl font-light text-white mb-6">Session Distribution</h2>
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={() => navigate('/loading-test')}
        className="fixed bottom-6 right-6 bg-purple-500/20 hover:bg-purple-500/30 backdrop-blur-sm z-50 
          border border-white/10 shadow-lg"
        size="lg"
      >
        <Icons.testTube className="mr-2 h-4 w-4" />
        Test Loading States
      </Button>
    </div>
  );
}