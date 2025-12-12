import { supabase, isSupabaseConfigured } from './supabase';
import { APIError, getErrorMessage } from './api';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  dateOfBirth: Date;
}

export interface SignInData {
  email: string;
  password: string;
}

export async function signUp({ email, password, name, dateOfBirth }: SignUpData) {
  if (!isSupabaseConfigured || !supabase) {
    throw new APIError('Supabase is not configured');
  }

  try {
    console.log('[Auth] Starting sign up for:', email);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          date_of_birth: dateOfBirth.toISOString(),
        }
      }
    });

    if (authError) {
      console.error('[Auth] Sign up auth error:', authError.message);
      throw new APIError(authError.message, authError.name);
    }
    
    if (!authData.user) {
      throw new APIError('User creation failed');
    }

    console.log('[Auth] User created:', authData.user.id);

    const age = new Date().getFullYear() - dateOfBirth.getFullYear();

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        date_of_birth: dateOfBirth.toISOString(),
        age,
      });

    if (userError) {
      console.error('[Auth] User record creation error:', userError.message);
      throw new APIError(userError.message, userError.code, userError.details);
    }

    console.log('[Auth] Sign up complete');
    return { user: authData.user, session: authData.session };
  } catch (error) {
    console.error('[Auth] Sign up error:', getErrorMessage(error));
    throw error;
  }
}

export async function signIn({ email, password }: SignInData) {
  if (!isSupabaseConfigured || !supabase) {
    throw new APIError('Supabase is not configured');
  }

  try {
    console.log('[Auth] Signing in:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Sign in error:', error.message);
      throw new APIError(error.message, error.name);
    }
    
    console.log('[Auth] Sign in successful');
    return data;
  } catch (error) {
    console.error('[Auth] Sign in error:', getErrorMessage(error));
    throw error;
  }
}

export async function signOut() {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[Auth] Supabase not configured, skipping sign out');
    return;
  }

  try {
    console.log('[Auth] Signing out');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Auth] Sign out error:', error.message);
      throw new APIError(error.message, error.name);
    }
    
    console.log('[Auth] Sign out successful');
  } catch (error) {
    console.error('[Auth] Sign out error:', getErrorMessage(error));
    throw error;
  }
}

export async function resetPassword(email: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new APIError('Supabase is not configured');
  }

  try {
    console.log('[Auth] Requesting password reset for:', email);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'yourapp://reset-password',
    });
    
    if (error) {
      console.error('[Auth] Password reset error:', error.message);
      throw new APIError(error.message, error.name);
    }
    
    console.log('[Auth] Password reset email sent');
  } catch (error) {
    console.error('[Auth] Password reset error:', getErrorMessage(error));
    throw error;
  }
}

export async function updatePassword(newPassword: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new APIError('Supabase is not configured');
  }

  try {
    console.log('[Auth] Updating password');
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) {
      console.error('[Auth] Password update error:', error.message);
      throw new APIError(error.message, error.name);
    }
    
    console.log('[Auth] Password updated successfully');
  } catch (error) {
    console.error('[Auth] Password update error:', getErrorMessage(error));
    throw error;
  }
}

export async function getSession() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Auth] Get session error:', error.message);
      throw new APIError(error.message, error.name);
    }
    
    return data.session;
  } catch (error) {
    console.error('[Auth] Get session error:', getErrorMessage(error));
    return null;
  }
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('[Auth] Get current user error:', error.message);
      throw new APIError(error.message, error.name);
    }
    
    return user;
  } catch (error) {
    console.error('[Auth] Get current user error:', getErrorMessage(error));
    return null;
  }
}
