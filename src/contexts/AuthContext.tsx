import React, { createContext, Provider, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthError } from '@supabase/supabase-js'
import { Provider as OAuthProvider } from '@supabase/supabase-js'
import { toast } from '../components/ui/use-toast';

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ data: any; error: null }>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ data: any; error: null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          
          // Ensure profile exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError || !profile) {
            // Create profile if doesn't exist
            const { error: createError } = await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata.full_name || '',
                avatar_url: session.user.user_metadata.avatar_url || '',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'id' });
            
            if (createError) console.error('Error creating profile:', createError);
          }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth event:', event);
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
            
            // Ensure profile exists on sign in
            const { error: upsertError } = await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata.full_name || '',
                avatar_url: session.user.user_metadata.avatar_url || '',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'id' });
            
            if (upsertError) console.error('Error upserting profile:', upsertError);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        });

        return () => subscription.unsubscribe();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return { data, error };
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Google sign in error:', error)
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: "Could not sign in with Google. Please try again."
      })
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: "Failed to sign out. Please try again.",
      });
      throw error;
    }
  };

  const ensureUserProfile = async (user: User) => {
    try {
      // First check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching profile:', fetchError);
        throw fetchError;
      }

      if (!existingProfile) {
        // Create new profile
        const { error: createError } = await supabase
          .from('profiles')
          .insert([{  // Note the array syntax
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            updated_at: new Date().toISOString()
          }]);

        if (createError) {
          console.error('Profile creation error:', createError);
          throw createError;
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Profile Error",
        description: "Failed to create user profile. Please try again.",
      });
      throw error;
    }
  };

  const value = {
    user,
    isLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 