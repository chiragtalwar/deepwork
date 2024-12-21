import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Icons } from '@/components/ui/icons';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash fragment from the URL
        const hashFragment = window.location.hash;
        
        if (hashFragment) {
          // Exchange the access token for a session
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: hashFragment.split('access_token=')[1].split('&')[0],
            refresh_token: hashFragment.split('refresh_token=')[1].split('&')[0],
          });

          if (error) throw error;

          if (session?.user) {
            console.log('Auth success, redirecting to rooms...');
            navigate('/rooms', { replace: true });
            return;
          }
        }

        // Fallback to getting current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          navigate('/rooms', { replace: true });
        } else {
          throw new Error('No session found');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/auth?error=callback_failed');
      }
    };

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