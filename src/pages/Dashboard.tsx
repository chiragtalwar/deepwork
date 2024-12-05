import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserSessions();
  }, []);

  const fetchUserSessions = async () => {
    try {
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) throw error;
      setSessions(sessionData || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Progress</h1>
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Focus Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">{weeklyHours} Hours</p>
              <p className="text-sm text-muted-foreground">This week</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">{currentStreak} Days</p>
              <p className="text-sm text-muted-foreground">Keep it up!</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">{sessions.length}</p>
              <p className="text-sm text-muted-foreground">All time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="md:col-span-3 mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Deep Work Contributions</CardTitle>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              Less
              <div className="flex gap-1 ml-2">
                <div className="w-3 h-3 rounded-sm bg-gray-100" />
                <div className="w-3 h-3 rounded-sm bg-purple-200" />
                <div className="w-3 h-3 rounded-sm bg-purple-400" />
                <div className="w-3 h-3 rounded-sm bg-purple-600" />
              </div>
              More
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-3">
              <div className="flex text-sm text-muted-foreground justify-between px-2">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 52 }).map((_, week) => (
                  <div key={week} className="flex flex-col gap-1">
                    {Array.from({ length: 7 }).map((_, day) => {
                      const dataIndex = week * 7 + day;
                      const dayData = contributionData[dataIndex];
                      return (
                        <div
                          key={day}
                          className={`w-3 h-3 rounded-sm transition-colors hover:ring-2 hover:ring-offset-2 hover:ring-purple-400 ${getContributionColor(
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
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Focus Hours</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}