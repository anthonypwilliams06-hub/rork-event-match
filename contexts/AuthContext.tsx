import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { User } from '@/types';
import { trpcClient } from '@/lib/trpc';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;

    if (!isSupabaseConfigured || !supabase) {
      console.warn('[Auth] Supabase not configured, skipping auth initialization');
      if (isMounted) {
        setIsLoading(false);
      }
      return;
    }

    const setupAuth = async () => {
      try {
        await loadSession();

        if (!isMounted) return;

        const { data } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (!isMounted) return;
            
            console.log('[Auth] State changed:', _event, session?.user?.id);
            setSession(session);
            
            if (session?.user) {
              try {
                const userProfile = await trpcClient.profile.get.query({
                  userId: session.user.id,
                }).catch(() => null);
                
                if (!isMounted) return;
                
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.name || '',
                  dateOfBirth: new Date(),
                  age: 18,
                  createdAt: new Date(session.user.created_at),
                  profile: userProfile ?? undefined,
                });
                setIsAuthenticated(true);
              } catch (error) {
                console.warn('[Auth] Error fetching profile:', error);
                if (isMounted) {
                  setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata?.name || '',
                    dateOfBirth: new Date(),
                    age: 18,
                    createdAt: new Date(session.user.created_at),
                    profile: undefined,
                  });
                  setIsAuthenticated(true);
                }
              }
            } else {
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        );
        authListener = data;
      } catch (error) {
        console.error('[Auth] Error setting up auth:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      isMounted = false;
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const loadSession = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('Loading session from Supabase...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error loading session:', error.message);
        setIsLoading(false);
        return;
      }

      if (session) {
        console.log('Session found:', session.user.id);
        setSession(session);
        
        const userProfile = await trpcClient.profile.get.query({
          userId: session.user.id,
        }).catch(() => null);

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || '',
          dateOfBirth: new Date(),
          age: 18,
          createdAt: new Date(session.user.created_at),
          profile: userProfile ?? undefined,
        });
        setIsAuthenticated(true);
      } else {
        console.log('No session found');
      }
    } catch (error) {
      console.warn('[Auth] Could not load session:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, dateOfBirth: Date) => {
    try {
      console.log('[Auth] Starting signup for:', email);
      console.log('[Auth] Data:', { email, name, dateOfBirth: dateOfBirth.toISOString() });
      
      const result = await trpcClient.auth.signup.mutate({
        email,
        password,
        name,
        dateOfBirth: dateOfBirth.toISOString(),
      });

      console.log('[Auth] Signup successful:', result);
      console.log('[Auth] Now logging in...');
      
      const loginResult = await trpcClient.auth.login.mutate({
        email,
        password,
      });

      console.log('[Auth] Login successful:', loginResult);

      if (loginResult.session) {
        setSession(loginResult.session);
        setUser({
          ...loginResult.user,
          profile: loginResult.user.profile ?? undefined,
        });
        setIsAuthenticated(true);
      }

      return result;
    } catch (error) {
      console.error('[Auth] ❌ Signup error details:', error);
      
      if (error instanceof Error) {
        console.error('[Auth] Error message:', error.message);
        console.error('[Auth] Error stack:', error.stack);
      }
      
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await trpcClient.auth.login.mutate({
        email,
        password,
      });

      if (result.session) {
        setSession(result.session);
        setUser({
          ...result.user,
          profile: result.user.profile ?? undefined,
        });
        setIsAuthenticated(true);
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await trpcClient.auth.logout.mutate({ token: '' });
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const result = await trpcClient.auth.requestReset.mutate({ email });
      return result;
    } catch (error) {
      console.error('Request password reset error:', error);
      throw error;
    }
  };

  const confirmPasswordReset = async (resetToken: string, newPassword: string) => {
    try {
      const result = await trpcClient.auth.confirmReset.mutate({
        token: resetToken,
        newPassword,
      });
      return result;
    } catch (error) {
      console.error('Confirm password reset error:', error);
      throw error;
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return {
    user,
    token: session?.access_token || null,
    session,
    isLoading,
    isAuthenticated,
    signup,
    login,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    updateUser,
  };
});
