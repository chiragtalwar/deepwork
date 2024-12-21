import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Icons } from '@/components/ui/icons';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange the token for a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        // Wait briefly for auth state to sync
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check session and redirect
        if (session?.user) {
          console.log('Auth success, redirecting to rooms...');
          navigate('/rooms', { replace: true });
        } else {
          throw new Error('No session found');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/auth?error=callback_failed');
      }
    };

    // Execute immediately
    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Icons.spinner className="h-8 w-8 animate-spin" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
} 