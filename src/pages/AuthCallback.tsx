import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Icons } from '@/components/ui/icons';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse URL for errors
        const params = new URLSearchParams(window.location.search);
        const errorCode = params.get('error_code');
        const errorDesc = params.get('error_description');

        if (errorCode || errorDesc) {
          console.error('Auth Error:', { errorCode, errorDesc });
          throw new Error(errorDesc || 'Authentication failed');
        }

        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        console.log('Session status:', { 
          exists: !!session, 
          user: session?.user?.email 
        });

        if (!session?.user) {
          throw new Error('No session found');
        }

        // Redirect to rooms
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