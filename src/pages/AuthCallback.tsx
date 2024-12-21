import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Icons } from '@/components/ui/icons';
    
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get hash parameters from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (!accessToken) {
          throw new Error('No access token found');
        }

        // Exchange the token for a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session?.user) {
          throw new Error('No session found');
        }

        // Log success
        console.log('Auth success:', {
          user: session.user.email,
          token: accessToken?.substring(0, 10) + '...'
        });

        // Navigate to rooms
        navigate('/rooms', { replace: true });
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