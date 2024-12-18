import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthError, User } from '@supabase/supabase-js';
import { toast } from '../components/ui/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        setUser(session?.user ?? null);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth event:', event);
          setUser(session?.user ?? null);
          
          if (event === 'TOKEN_REFRESHED') {
            console.log('Session refreshed');
          } else if (event === 'SIGNED_OUT') {
            toast({
              title: "Session ended",
              description: "Please sign in again.",
            });
          }
        });

        return () => subscription.unsubscribe();
      } catch (err) {
        console.error('Auth error:', err);
        setError(err as AuthError);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "There was a problem with your session.",
        });
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  return { user, loading, error };
}; 