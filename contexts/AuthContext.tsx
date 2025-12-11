import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthSession } from '@/types';
import { trpcClient } from '@/lib/trpc';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_SESSION_KEY = 'auth_session';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSession = async () => {
    try {
      console.log('Loading session from storage...');
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const storedSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);

      if (storedToken && storedSession) {
        console.log('Session found in storage');
        const session: AuthSession = JSON.parse(storedSession);
        
        if (new Date(session.expiresAt) > new Date()) {
          console.log('Session is valid, restoring user:', session.user.email);
          setToken(storedToken);
          setUser(session.user);
          setIsAuthenticated(true);
        } else {
          console.log('Session expired, clearing...');
          await clearSession();
        }
      } else {
        console.log('No session found in storage');
      }
    } catch (error) {
      if (error instanceof Error && (error.name === 'SecurityError' || error.message.includes('insecure') || error.message.includes('operation is insecure'))) {
        console.warn('[Auth] Storage unavailable in insecure context. Using memory-only session.');
      } else {
        console.warn('[Auth] Could not load session from storage:', error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveSession = async (session: AuthSession) => {
    setToken(session.token);
    setUser(session.user);
    setIsAuthenticated(true);
    
    try {
      console.log('Saving session to storage for user:', session.user.email);
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, session.token);
      await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      console.log('Session saved successfully');
    } catch (error) {
      if (error instanceof Error && (error.name === 'SecurityError' || error.message.includes('insecure') || error.message.includes('operation is insecure'))) {
        console.warn('[Auth] Storage unavailable in insecure context. Session active but will not persist.');
      } else {
        console.warn('[Auth] Could not persist session to storage:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  const clearSession = async () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    } catch (error) {
      if (error instanceof Error && (error.name === 'SecurityError' || error.message.includes('insecure') || error.message.includes('operation is insecure'))) {
        console.warn('[Auth] Storage unavailable in insecure context.');
      } else {
        console.warn('[Auth] Could not clear session from storage:', error instanceof Error ? error.message : 'Unknown error');
      }
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

      await saveSession(result);
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

      await saveSession(result);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await trpcClient.auth.logout.mutate({ token });
      }
      await clearSession();
    } catch (error) {
      console.error('Logout error:', error);
      await clearSession();
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
    token,
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
