import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Icons } from '@/components/ui/icons';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // First try to exchange the auth code
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(
          window.location.search
        );

        if (error) {
          console.error('Code exchange error:', error);
          throw error;
        }

        if (session?.user) {
          console.log('Auth success:', session.user.email);
          navigate('/rooms', { replace: true });
          return;
        }

        throw new Error('No session found');
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