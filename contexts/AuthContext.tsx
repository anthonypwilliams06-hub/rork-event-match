import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { User } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { signupViaHTTP } from '@/lib/authSignup';
import { logError, setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry';
import { trackSignupStarted, trackSignupCompleted, trackSignupFailed, trackLoginStarted, trackLoginCompleted, trackLoginFailed } from '@/lib/analytics';



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
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('user_id', session.user.id)
                  .single();
                
                if (!isMounted) return;
                setUser(mapSupabaseUser(session.user, profileData ? mapProfileData(profileData) : undefined));
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
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        setUser(mapSupabaseUser(session.user, profileData ? mapProfileData(profileData) : undefined));
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
      trackSignupStarted();
      
      if (!isSupabaseConfigured || !supabase) {
        const error = new Error('Supabase not configured');
        trackSignupFailed(error.message, 'configuration');
        throw error;
      }

      console.log('[Auth] Starting signup for:', email);
      
      const result = await signupViaHTTP({
        email,
        password,
        name,
        dateOfBirth: dateOfBirth.toISOString(),
      });

      if (!result.success) {
        const error = new Error(result.error || 'Signup failed');
        trackSignupFailed(error.message, 'account_creation');
        throw error;
      }

      console.log('[Auth] ✅ Account created, now signing in...');

      let loginData = null;
      let loginError = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, attempts * 1000));
        
        const result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        loginData = result.data;
        loginError = result.error;
        
        if (!loginError) {
          console.log('[Auth] ✅ Sign-in successful on attempt', attempts + 1);
          break;
        }
        
        console.log(`[Auth] Sign-in attempt ${attempts + 1} failed:`, loginError.message);
        attempts++;
      }

      if (loginError || !loginData) {
        const error = new Error(loginError?.message || 'Sign-in failed');
        trackSignupFailed(error.message, 'auto_signin');
        throw error;
      }

      if (loginData.session && loginData.user) {
        setSession(loginData.session);
        setUser(mapSupabaseUser(loginData.user, undefined));
        setIsAuthenticated(true);
        setSentryUser(loginData.user.id, loginData.user.email || undefined);
        trackSignupCompleted(loginData.user.id);
      }

      return { userId: result.userId, session: loginData.session };
    } catch (error) {
      console.error('[Auth] ❌ Signup error:', error);
      logError(error instanceof Error ? error : new Error('Unknown signup error'), { email });
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      trackLoginStarted();
      
      if (!isSupabaseConfigured || !supabase) {
        const error = new Error('Supabase not configured');
        trackLoginFailed(error.message);
        throw error;
      }

      console.log('[Auth] Attempting login for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] Login error:', error.message);
        console.error('[Auth] Error status:', error.status);
        console.error('[Auth] Error details:', JSON.stringify(error, null, 2));
        trackLoginFailed(error.message);
        logError(new Error(error.message), { email, status: error.status });
        throw new Error(error.message);
      }

      if (data.session && data.user) {
        console.log('[Auth] ✅ Login successful for user:', data.user.id);
        setSession(data.session);
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();
        
        setUser(mapSupabaseUser(data.user, profileData ? mapProfileData(profileData) : undefined));
        setIsAuthenticated(true);
        setSentryUser(data.user.id, data.user.email || undefined);
        trackLoginCompleted(data.user.id);
      }

      return data;
    } catch (error) {
      console.error('[Auth] Login error:', error);
      logError(error instanceof Error ? error : new Error('Unknown login error'), { email });
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      
      clearSentryUser();
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
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured');
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Request password reset error:', error);
      throw error;
    }
  };

  const confirmPasswordReset = async (resetToken: string, newPassword: string) => {
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured');
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
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

function mapSupabaseUser(user: SupabaseUser, profile?: User['profile']): User {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || '',
    dateOfBirth: new Date(),
    age: 18,
    createdAt: new Date(user.created_at),
    profile,
  };
}

function mapProfileData(data: any): User['profile'] {
  return {
    userId: data.user_id,
    role: data.role,
    bio: data.bio || undefined,
    interests: data.interests || [],
    personalityTraits: data.personality_traits || [],
    relationshipGoal: data.relationship_goal || undefined,
    location: data.location,
    ageRangeMin: data.age_range_min || undefined,
    ageRangeMax: data.age_range_max || undefined,
    verificationStatus: data.verification_status || 'unverified',
    dealbreakers: data.dealbreakers || undefined,
    photoUrl: data.photo_url || undefined,
    verificationPhoto: data.verification_photo || undefined,
    premiumTier: data.premium_tier || 'free',
    premiumExpiresAt: data.premium_expires_at ? new Date(data.premium_expires_at) : undefined,
  };
}
