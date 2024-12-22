import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Icons } from '../components/ui/icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLoadingState } from '../hooks/useLoadingState';

interface TestData {
  id: string;
  created_at: string;
}

export default function LoadingTest() {
  const [data, setData] = useState<TestData[]>([]);
  const { isLoading, withLoading, hasInitialData } = useLoadingState();
  const { user } = useAuth();
  const mounted = useRef(true);
  const [debugInfo, setDebugInfo] = useState({
    loadCount: 0,
    hasInitialData: false,
    lastRefresh: '',
  });

  const fetchData = async () => {
    if (!user || !mounted.current) return;
    
    setDebugInfo(prev => ({
      ...prev,
      loadCount: prev.loadCount + 1,
      lastRefresh: new Date().toISOString(),
    }));

    await withLoading(async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (mounted.current && data) {
        setData(data);
      }
    }, !hasInitialData());
  };

  useEffect(() => {
    mounted.current = true;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted.current && !isLoading) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    fetchData();

    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      hasInitialData: hasInitialData(),
    }));
  }, [hasInitialData()]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#a5b9c5] via-[#8da3b0] to-[#6b8795] p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
          <h1 className="text-2xl font-light text-white">Loading State Test</h1>
          
          <div className="space-y-2 text-white/80">
            <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
            <p>Has Initial Data: {debugInfo.hasInitialData ? 'Yes' : 'No'}</p>
            <p>Load Count: {debugInfo.loadCount}</p>
            <p>Last Refresh: {debugInfo.lastRefresh ? new Date(debugInfo.lastRefresh).toLocaleTimeString() : 'Never'}</p>
          </div>

          <Button 
            onClick={fetchData}
            className="bg-white/10 hover:bg-white/20"
          >
            Manual Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Icons.spinner className="h-8 w-8 animate-spin text-white/60" />
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <h2 className="text-xl font-light text-white mb-4">Data ({data.length} items)</h2>
            <div className="space-y-2">
              {data.map(item => (
                <div key={item.id} className="text-white/80 text-sm">
                  {item.created_at}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 