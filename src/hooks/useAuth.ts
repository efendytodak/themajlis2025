import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, auth } from '../lib/supabase'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // Check if Supabase is properly configured
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('❌ Supabase environment variables are missing!')
          console.error('Please create a .env file in your project root with:')
          console.error('VITE_SUPABASE_URL=https://your-project.supabase.co')
          console.error('VITE_SUPABASE_ANON_KEY=your-anon-key')
          setUser(null)
          setLoading(false)
          return
        }

        // Check for placeholder values
        if (supabaseUrl.includes('YOUR_SUPABASE') || 
            supabaseAnonKey.includes('YOUR_SUPABASE') ||
            supabaseUrl.includes('your-project') ||
            supabaseAnonKey.includes('your-anon-key')) {
          console.error('❌ Placeholder values detected in environment variables!')
          console.error('Please replace the placeholder values in .env with your actual Supabase credentials:')
          console.error('1. Go to https://supabase.com/dashboard')
          console.error('2. Select your project')
          console.error('3. Go to Project Settings → API')
          console.error('4. Copy your Project URL and anon/public key')
          setUser(null)
          setLoading(false)
          return
        }
        
        // Validate URL format
        if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
          console.error('❌ Invalid Supabase URL format!')
          console.error('VITE_SUPABASE_URL should look like: https://your-project-id.supabase.co')
          console.error('Current value:', supabaseUrl)
          setUser(null)
          setLoading(false)
          return
        }

        // Check if supabase client is available
        if (!supabase) {
          console.error('❌ Supabase client failed to initialize!')
          console.error('This usually means your environment variables are incorrect.')
          console.error('Please check your .env file and restart the development server.')
          setUser(null)
          setLoading(false)
          return
        }
        const { user, error } = await auth.getCurrentUser()
        
        if (error) {
          // Handle specific "Auth session missing!" error
          if (error.message?.includes('Auth session missing!')) {
            console.warn('Auth session missing - this is normal for first-time visitors or after logout')
            setUser(null)
            setLoading(false)
            return
          }
          
          console.error('Authentication error:', error.message)
          // If session is invalid/expired, clear it and local storage
          if (error.message?.includes('session_not_found') || 
              error.message?.includes('refresh_token_not_found') ||
              error.message?.includes('Invalid Refresh Token') ||
              error.message?.includes('Failed to fetch') ||
              error.message?.includes('Auth session missing!')) {
            if (supabase) {
              await supabase.auth.signOut()
            }
            // Clear all Supabase-related tokens from local storage
            clearAllSupabaseTokens()
            // Don't force reload on connection errors, just clear state
            if (!error.message?.includes('Failed to fetch')) {
              window.location.reload()
            }
            return
          }
          setUser(null)
        } else {
          setUser(user)
        }
      } catch (error: any) {
        // Handle any unexpected errors
        console.error('Auth error:', error.message || error)
        
        // Handle network/connection errors more gracefully
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          console.error('Connection failed. Please check your internet connection and Supabase configuration.')
          setUser(null)
          setLoading(false)
          return
        }
        
        // Clear potentially corrupted session data
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('Invalid Refresh Token') ||
            error.message?.includes('Auth session missing!')) {
          try {
            if (supabase) {
              await supabase.auth.signOut()
            }
            // Clear all Supabase-related tokens from local storage
            clearAllSupabaseTokens()
            // Force page reload to reinitialize Supabase client
            window.location.reload()
            return
          } catch (signOutError) {
            console.error('Error clearing session:', signOutError)
            // Even if signOut fails, reload to clear corrupted state
            window.location.reload()
            return
          }
        }
        
        if (error.message?.includes('Failed to fetch')) {
          console.error('Connection failed. Please check your Supabase configuration and internet connection.')
        }
        setUser(null)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    let subscription: any = null
    
    if (supabase) {
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          // Handle token refresh errors
          if (event === 'TOKEN_REFRESHED' && !session) {
            console.warn('Token refresh failed, clearing session')
            // Clear all Supabase-related tokens from local storage
            clearAllSupabaseTokens()
            // Force page reload to reinitialize Supabase client
            window.location.reload()
            return
          }
          
          setUser(session?.user ?? null)
          setLoading(false)
        }
      )
      subscription = authSubscription
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  // Helper function to clear all Supabase-related tokens from localStorage
  const clearAllSupabaseTokens = () => {
    try {
      // Get all localStorage keys
      const keys = Object.keys(localStorage)
      
      // Remove all keys that start with 'sb-' or are exactly 'supabase.auth.token'
      keys.forEach(key => {
        if (key.startsWith('sb-') || key === 'supabase.auth.token') {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Error clearing Supabase tokens:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const result = await auth.signIn(email, password)
    setLoading(false)
    return result
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const result = await auth.signOut()
      // Ensure local storage is cleared
      clearAllSupabaseTokens()
      setLoading(false)
      return result
    } catch (error) {
      // Even if signOut fails, clear local storage
      clearAllSupabaseTokens()
      setUser(null)
      setLoading(false)
      return { error }
    }
  }

  return {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user
  }
}