import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { User } from '@/types';
import { trpcClient } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth state changed:', _event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
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
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadSession = async () => {
    try {
      console.log('Loading session from Supabase...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error loading session:', error.message);
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
      const result = await trpcClient.auth.signup.mutate({
        email,
        password,
        name,
        dateOfBirth: dateOfBirth.toISOString(),
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
      console.error('Signup error:', error);
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
      await supabase.auth.signOut();
      
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
