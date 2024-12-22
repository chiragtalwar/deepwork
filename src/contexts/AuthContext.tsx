import React, { createContext, Provider, useContext, useEffect, useState, useRef } from 'react'
import { Session, Subscription, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthError } from '@supabase/supabase-js'
import { Provider as OAuthProvider } from '@supabase/supabase-js'
import { toast } from '../components/ui/use-toast';

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ data: any; error: null }>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ data: any; error: null }>
  signInWithGoogle: () => Promise<{ data: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const authInitialized = useRef(false)

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted && session?.user) {
          console.log('Auth initialized with user:', session.user.id)
          setUser(session.user)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event)
      if (mounted) {
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return { data, error }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) throw error
    return { data, error }
  }

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'email profile'
      }
    })

    if (error) throw error
    return { data }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: "Failed to sign out. Please try again.",
      })
      throw error
    }
  }

  const ensureUserProfile = async (user: User) => {
    try {
      // First check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching profile:', fetchError)
        throw fetchError
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
          }])

        if (createError) {
          console.error('Profile creation error:', createError)
          throw createError
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Profile Error",
        description: "Failed to create user profile. Please try again.",
      })
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
    }
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