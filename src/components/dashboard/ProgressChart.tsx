import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { progressService } from '@/lib/services/progressService';

export function ProgressChart() {
  const [data, setData] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const sessions = await progressService.getRecentSessions();
      const chartData = processSessionData(sessions);
      setData(chartData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processSessionData = (sessions: any[]) => {
    // Process sessions into chart data format
    // This is a simplified example
    return sessions.map(session => ({
      date: new Date(session.start_time).toLocaleDateString(),
      hours: session.duration / 3600,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Focus Time History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading chart...</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
} 