import { useEffect, useState, useRef, useCallback } from 'react';
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
 const { user, loading: authLoading } = useAuth();
 const { isLoading, withLoading } = useLoadingState();
 const [data, setData] = useState<TestData[]>([]);
 const mounted = useRef(true);
 const fetchInProgress = useRef(false);
 const loadCountRef = useRef(0);

 const [debugInfo, setDebugInfo] = useState({
  loadCount: 0,
  hasInitialData: false,
  lastRefresh: 'Never',
  tabSwitches: 0,
  lastVisibilityChange: 'Never'
 });

 // Wait for auth to be ready
 useEffect(() => {
  if (authLoading) {
   console.log('Waiting for auth...');
   return;
  }

  if (!user) {
   console.log('No user after auth load');
   return;
  }

  console.log('Auth ready, user:', user.id);
  fetchData(false);
 }, [user, authLoading]);

 const fetchData = async (isTabSwitch = false) => {
  if (!user || !mounted.current || fetchInProgress.current) {
   console.log('Fetch blocked:', { 
    noUser: !user, 
    notMounted: !mounted.current, 
    inProgress: fetchInProgress.current,
    userId: user?.id 
   });
   return;
  }

  fetchInProgress.current = true;
  const now = new Date().toLocaleTimeString();
  console.log('Starting fetch for user:', user.id);

  try {
   await withLoading(async () => {
    const response = await supabase
     .from('sessions')
     .select('*')
     .eq('user_id', user.id)
     .order('created_at', { ascending: false });

    console.log('Supabase response:', response);

    if (response.error) throw response.error;

    if (mounted.current) {
     setData(response.data || []);
     loadCountRef.current += 1;
     
     setDebugInfo(prev => ({
      ...prev,
      loadCount: loadCountRef.current,
      lastRefresh: now,
      hasInitialData: true
     }));
    }
   });
  } catch (error) {
   console.error('Fetch failed:', error);
  } finally {
   if (mounted.current) {
    fetchInProgress.current = false;
   }
  }
 };

 const handleVisibilityChange = useCallback(() => {
  if (document.visibilityState === 'visible' && mounted.current) {
   const now = new Date().toLocaleTimeString();
   
   setDebugInfo(prev => ({
    ...prev,
    tabSwitches: prev.tabSwitches + 1,
    lastVisibilityChange: now
   }));
   
   if (!fetchInProgress.current) {
    fetchData(true);
   }
  }
 }, [debugInfo.tabSwitches]);

 // Initial load effect
 useEffect(() => {
  if (!user) {
   console.log('No user yet, user state:', user);
   return;
  }
  
  console.log('Initial load effect triggered with user:', user.id);
  mounted.current = true;
  
  // Immediate initial fetch
  fetchData(false);

  return () => {
   mounted.current = false;
  };
 }, [user]);

 // Visibility change effect
 useEffect(() => {
  if (!user) return;

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
   document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
 }, [user, handleVisibilityChange]);

 // Manual refresh handler
 const handleManualRefresh = () => {
  console.log('Manual refresh triggered');
  fetchData(false);
 };

 // Reset state handler
 const handleReset = () => {
  console.log('Resetting state');
  loadCountRef.current = 0;
  setDebugInfo({
   loadCount: 0,
   hasInitialData: false,
   lastRefresh: 'Never',
   tabSwitches: 0,
   lastVisibilityChange: 'Never'
  });
  setData([]);
 };

 return (
  <div className="min-h-screen bg-gradient-to-br from-[#a5b9c5] via-[#8da3b0] to-[#6b8795] p-8">
   <div className="max-w-2xl mx-auto space-y-6">
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 space-y-4">
     <h1 className="text-2xl font-light text-white">Loading State Test</h1>
     
     <div className="space-y-2 text-white/80">
      <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
      <p>Has Initial Data: {debugInfo.hasInitialData ? 'Yes' : 'No'}</p>
      <p>Load Count: {debugInfo.loadCount}</p>
      <p>Tab Switches: {debugInfo.tabSwitches}</p>
      <p>Last Refresh: {debugInfo.lastRefresh}</p>
      <p>Last Tab Switch: {debugInfo.lastVisibilityChange}</p>
     </div>
      <div className="flex gap-2">
       <Button 
         onClick={handleManualRefresh}
         className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded"
       >
         Manual Refresh
       </Button>
        <Button 
         onClick={handleReset}
         className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded"
       >
         Reset State
       </Button>
     </div>
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