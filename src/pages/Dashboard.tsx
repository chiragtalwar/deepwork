import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Icons } from '../components/ui/icons';
import { Progress } from '../components/ui/progress';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, CartesianGrid, BarChart, Bar } from 'recharts';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLoadingState } from '../hooks/useLoadingState';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUserStats } from '../hooks/useUserStats';

interface UserStats {
  id: string;
  user_id: string;
  total_sessions: number;
  current_streak: number;
  weekly_focus_minutes: number;
  last_session_date: string;
  created_at: string;
  updated_at: string;
}

interface ChartDataPoint {
  date: string;
  sessions: number;
  label?: string;
}

const KPICardSkeleton = () => (
  <div className="group relative overflow-hidden rounded-xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 transition-all duration-300">
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 bg-white/20 rounded animate-pulse" />
        <div className="w-24 h-4 bg-white/20 rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="w-16 h-8 bg-white/20 rounded animate-pulse" />
        <div className="w-32 h-4 bg-white/20 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'W' | 'M'>('W');
  const [sessionData, setSessionData] = useState<ChartDataPoint[]>([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const mounted = useRef(true);

  // Use the real-time stats hook instead of direct fetching
  const { stats: userStatsMap } = useUserStats(user ? [user.id] : []);
  const userStats = user ? userStatsMap[user.id] : null;

  useEffect(() => {
    if (userStats) {
      setIsLoading(false);
    }
  }, [userStats]);

  const calculateWeeklyFocusTime = () => {
    if (!userStats) return 0;
    return Math.round(userStats.weekly_focus_minutes / 60); // Convert minutes to hours
  };

  const getTodayProgress = () => {
    if (!userStats) return "+0m today";
    const lastSessionDate = userStats.last_session_date ? new Date(userStats.last_session_date) : null;
    const today = new Date();
    
    // Check if last session was today
    if (lastSessionDate && 
        lastSessionDate.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
      return `+${userStats.weekly_focus_minutes}m today`;
    }
    return "No sessions yet";
  };

  const calculateStreak = () => {
    return userStats?.current_streak || 0;
  };

  const fetchSessionData = useCallback(async () => {
    if (!user || !userStats) return;
    
    const data: ChartDataPoint[] = [];
    const now = new Date();
    
    // Optimized data calculation
    const calculateData = () => {
      if (timePeriod === 'W') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const lastSessionDate = userStats.last_session_date ? new Date(userStats.last_session_date) : null;
        
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          const hours = lastSessionDate && dateStr === lastSessionDate.toISOString().split('T')[0]
            ? Math.round((userStats.weekly_focus_minutes / 60) * 10) / 10
            : 0;
          
          return {
            date: dateStr,
            sessions: hours,
            label: date.toLocaleDateString('en-US', { weekday: 'short' })
          };
        });
      } else {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() + monthOffset);
        startDate.setDate(1);
        
        const lastSessionDate = userStats.last_session_date ? new Date(userStats.last_session_date) : null;
        const lastSessionMonth = lastSessionDate?.getMonth();
        const lastSessionYear = lastSessionDate?.getFullYear();
        
        return Array.from({ length: 6 }, (_, i) => {
          const date = new Date(startDate);
          date.setMonth(startDate.getMonth() + i - 5);
          
          const hours = lastSessionDate && 
            date.getMonth() === lastSessionMonth && 
            date.getFullYear() === lastSessionYear
              ? Math.round((userStats.weekly_focus_minutes / 60) * 10) / 10
              : 0;
          
          return {
            date: date.toISOString().split('T')[0],
            sessions: hours,
            label: date.toLocaleDateString('en-US', { month: 'short' })
          };
        });
      }
    };

    setSessionData(calculateData());
  }, [user, userStats, timePeriod, monthOffset]);

  // Fetch session data when dependencies change
  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Optimized contribution grid data processing
  const processContributionData = useCallback(() => {
    if (!userStats) return [];
    
    const startDate = new Date('2025-01-01');
    const contributionData = Array.from({ length: 52 * 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const hours = userStats.last_session_date?.startsWith(dateStr)
        ? Math.round(userStats.weekly_focus_minutes / 60)
        : 0;
        
      return { date: dateStr, sessions: hours };
    });

    return contributionData;
  }, [userStats]);

  const contributionData = useMemo(() => processContributionData(), [processContributionData]);

  // New color scale function
  const getCellColor = (intensity: number) => {
    if (intensity === 0) return 'bg-white/5';
    if (intensity <= 1) return 'bg-blue-400/20';
    if (intensity <= 2) return 'bg-blue-400/40';
    if (intensity <= 3) return 'bg-blue-400/60';
    return 'bg-blue-400/80';
  };

  const getContributionColor = (sessions: number) => {
    if (sessions === 0) return 'bg-gray-100';
    if (sessions === 1) return 'bg-purple-200';
    if (sessions === 2) return 'bg-purple-400';
    return 'bg-purple-600';
  };

  const weeklyHours = calculateWeeklyFocusTime();
  const currentStreak = calculateStreak();
  const totalSessions = userStats?.total_sessions || 0;

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

  const getChartData = (): ChartDataPoint[] => {
    return sessionData;
  };

  const Chart = useMemo(() => {
    if (!sessionData.length) return null;

    return (
      <div className="h-[70px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sessionData} margin={{ top: 15, right: 0, bottom: 5, left: 0 }}>
            <Bar
              dataKey="sessions"
              fill="#10b981"
              radius={[2, 2, 0, 0]}
              label={{
                position: 'top',
                content: ({ x, y, width, value }: any) => {
                  if (!value || value <= 0) return null;
                  return (
                    <text
                      x={Number(x) + Number(width) / 2}
                      y={Number(y) - 6}
                      fill="#10b981"
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight="500"
                    >
                      {value}h
                    </text>
                  );
                }
              }}
            />
            <YAxis hide domain={[0, (dataMax: number) => Math.max(dataMax * 1.3, 1)]} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'rgba(255,255,255,0.6)',
                fontSize: 10,
                dy: 8
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-[#1a2e3c] px-2.5 py-1.5 rounded-lg border border-white/10 shadow-xl">
                    <p className="text-[10px] text-white/70 mb-0.5">{data.label}</p>
                    <p className="text-xs font-medium text-emerald-400">{payload[0].value}h focused</p>
                  </div>
                );
              }}
              cursor={{ fill: '#ffffff08' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }, [sessionData]);

  const TimeControls = useMemo(() => (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <button
          className="p-1 rounded-md text-white/60 hover:text-white/90 hover:bg-white/5 transition-all"
          onClick={() => timePeriod === 'M' && setMonthOffset(prev => prev - 6)}
        >
          <Icons.chevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          className="p-1 rounded-md text-white/60 hover:text-white/90 hover:bg-white/5 transition-all"
          onClick={() => timePeriod === 'M' && setMonthOffset(prev => Math.min(prev + 6, 0))}
        >
          <Icons.chevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-1 border-l border-white/10 pl-3">
        {[
          { id: 'W', label: 'Week' },
          { id: 'M', label: 'Month' }
        ].map(({ id, label }) => (
          <button
            key={id}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all 
              ${timePeriod === id 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'text-white/60 hover:text-white/90 hover:bg-white/5'
              }`}
            onClick={() => {
              setTimePeriod(id as 'W' | 'M');
              setMonthOffset(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  ), [timePeriod, monthOffset]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#a5b9c5] via-[#8da3b0] to-[#6b8795]">
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10 animate-gradient" />

      <div className="relative container mx-auto px-4 py-4 pt-12">
        <div className="flex items-center justify-between mb-12">
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-4">
          {isLoading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : (
            <>
          <div className="group relative overflow-hidden rounded-xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-[#2a3f4c]/50">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Icons.clock className="h-4 w-4 text-white/90" />
                <span className="text-white/90 text-base font-medium">Focus Time</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-4xl font-light text-white flex items-baseline">
                    {weeklyHours}h
                      <span className="text-sm text-emerald-400/90 ml-2 font-medium">
                        {getTodayProgress()}
                      </span>
                    </p>
                    <p className="text-white/60 text-xs mt-0.5">
                      {weeklyHours > 0 ? "You're making progress! 🚀" : "Let's start focusing!"}
                  </p>
                </div>
                
                      {TimeControls}
                </div>

                {/* Chart Container */}
                <div className="flex flex-col w-full">
                      {Chart}
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-[#2a3f4c]/50">
            <div className="px-4 py-3">
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

          <div className="group relative overflow-hidden rounded-xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-[#2a3f4c]/50">
            <div className="px-4 py-3">
              <div className="flex items-center gap-3 mb-4">
                <Icons.target className="h-5 w-5 text-emerald-400" />
                <span className="text-white/90 text-lg font-medium">Total Sessions</span>
              </div>
              
              <div className="space-y-3">
                <p className="text-5xl font-light text-white">{totalSessions}</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <p className="text-white/70 text-sm">Lifetime focus sessions</p>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>

        <div className="rounded-xl bg-[#2a3f4c]/40 backdrop-blur-md border border-white/10 p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light text-white flex items-center gap-3">
            <Icons.activity className="h-5 w-5 text-white/90" />
              Deep Work Journey
          </h2>
            <div className="flex items-center gap-6">
              {/* Total Focus Hours */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <Icons.clock className="h-4 w-4 text-blue-400/90" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {Math.round((userStats?.weekly_focus_minutes || 0) / 60)} hours focused
                  </p>
                  <p className="text-[10px] text-white/60">lifetime deep work</p>
                </div>
              </div>

              {/* Days of Deep Work */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <Icons.calendar className="h-4 w-4 text-blue-400/90" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {userStats?.total_sessions || 0}/365 days
                  </p>
                  <p className="text-[10px] text-white/60">of deep work this year</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 text-sm text-white/60 border-l border-white/10 pl-6">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-100/80" />
                  <span>Less</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-500/80" />
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Months labels */}
            <div className="flex justify-between px-12 mb-4">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                <span key={month} className="text-sm text-white/70 font-medium">{month}</span>
              ))}
            </div>

            {/* Days of week */}
            <div className="absolute left-0 top-8 flex flex-col justify-between h-[168px] text-sm text-white/60">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="h-4 flex items-center">
                  <span className="pr-4">{day}</span>
                </div>
              ))}
            </div>

            {/* Contribution grid with larger, more visible cells */}
            <div className="pl-12">
              <div className="grid grid-flow-col gap-2">
                {/* First week with offset for Jan 1st (Wednesday) */}
                <div className="grid grid-rows-7 gap-2">
                  {/* Empty cells for Monday and Tuesday */}
                  <div className="w-4 h-4 rounded-sm bg-transparent" />
                  <div className="w-4 h-4 rounded-sm bg-transparent" />
                  {/* Cells for Wed-Sun */}
                  {Array.from({ length: 5 }).map((_, day) => {
                    const date = new Date('2025-01-01');
                    date.setDate(date.getDate() + day);
                    const dateStr = date.toISOString().split('T')[0];
                    const intensity = userStats?.last_session_date?.startsWith(dateStr) ? 
                      Math.round(userStats.weekly_focus_minutes / 60) : 0;
                    
                    return (
                      <div
                        key={day}
                        className={`
                          w-4 h-4 rounded-sm transition-all duration-200
                          ${getCellColor(intensity)}
                          hover:ring-2 hover:ring-white/30 hover:scale-110
                          group relative
                        `}
                      >
                        {/* Hover tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <div className="bg-[#1a2e3c] px-3 py-2 rounded-lg border border-white/10 shadow-xl whitespace-nowrap">
                            <p className="text-xs text-white/90 font-medium">
                              {date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-blue-400 font-semibold mt-0.5">
                              {intensity} hours focused
                            </p>
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 border-4 border-transparent border-t-[#1a2e3c]" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rest of the weeks */}
                {Array.from({ length: 51 }).map((_, week) => (
                  <div key={week} className="grid grid-rows-7 gap-2">
                    {Array.from({ length: 7 }).map((_, day) => {
                      const date = new Date('2025-01-01');
                      date.setDate(date.getDate() + (week + 1) * 7 + day - 2); // -2 to account for the offset
                      const dateStr = date.toISOString().split('T')[0];
                      const intensity = userStats?.last_session_date?.startsWith(dateStr) ? 
                        Math.round(userStats.weekly_focus_minutes / 60) : 0;
                      
                      return (
                        <div
                          key={day}
                          className={`
                            w-4 h-4 rounded-sm transition-all duration-200
                            ${getCellColor(intensity)}
                            hover:ring-2 hover:ring-white/30 hover:scale-110
                            group relative
                          `}
                        >
                          {/* Hover tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="bg-[#1a2e3c] px-3 py-2 rounded-lg border border-white/10 shadow-xl whitespace-nowrap">
                              <p className="text-xs text-white/90 font-medium">
                                {date.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                              <p className="text-sm text-blue-400 font-semibold mt-0.5">
                                {intensity} hours focused
                              </p>
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 border-4 border-transparent border-t-[#1a2e3c]" />
                          </div>
                        </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>

            {/* Encouraging message */}
            <div className="mt-6 flex items-center justify-center">
              <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <p className="text-sm text-white/80">
                  {totalSessions > 0 
                    ? "Every block represents a step in your deep work journey 🚀" 
                    : "Start your deep work journey today! 💫"}
                </p>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}