import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Icons } from '@/components/ui/icons';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session?.user) {
          throw new Error('No session found');
        }

        // Log success
        console.log('Auth success:', {
          user: session.user.email
        });

        // Wait for auth state to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if we have a user in context
        if (session.user) {
          navigate('/rooms', { replace: true });
        } else {
          throw new Error('User context not initialized');
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