import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/use-toast';
import { Icons } from '../components/ui/icons';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse URL for errors first
        const params = new URLSearchParams(window.location.search);
        const errorCode = params.get('error_code');
        const errorDesc = params.get('error_description');

        if (errorCode || errorDesc) {
          console.error('Auth Error:', { errorCode, errorDesc });
          throw new Error(errorDesc || 'Authentication failed');
        }

        // Wait a bit for Supabase to complete its internal auth process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get session and immediately check user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user) throw new Error('No session found');

        // Try to get existing profile first
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!profile && !profileError) {
          // Only create profile if it doesn't exist
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || '',
              updated_at: new Date().toISOString()
            });

          if (createError) {
            console.error('Profile creation error:', createError);
            throw createError;
          }
        }

        // Redirect to rooms page
        navigate('/rooms');
      } catch (error) {
        console.error('Auth callback error:', error);
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: error instanceof Error ? error.message : "Please try again or contact support",
        });
        navigate('/auth?mode=signin');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Icons.spinner className="h-8 w-8 animate-spin" />
        <p className="text-sm text-muted-foreground">Completing your sign in...</p>
      </div>
    </div>
  );
} 