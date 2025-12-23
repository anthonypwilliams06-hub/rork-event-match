import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type SignupInput = {
  email: string;
  password: string;
  name: string;
  dateOfBirth?: string;
};

export async function signupViaEdgeFunction(input: SignupInput) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }

  const { email, password, name, dateOfBirth } = input;

  console.log('[Auth] ===== Starting Edge Function Signup =====');
  console.log('[Auth] Supabase configured:', isSupabaseConfigured);
  console.log('[Auth] Calling sign_up with:', { email, name, dateOfBirth });
  console.log('[Auth] Function URL:', `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sign_up`);

  try {
    const { data, error } = await supabase.functions.invoke('sign_up', {
      body: { email, password, name, dateOfBirth },
    });

    if (error) {
      console.error('[Auth] ❌ Edge function error:');
      console.error('[Auth] Error message:', error.message);
      console.error('[Auth] Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Edge function failed: ${error.message}`);
    }

    console.log('[Auth] ✅ Edge function response:', data);
    console.log('[Auth] ===== Signup Complete =====');
    return data;
  } catch (err) {
    console.error('[Auth] ❌ Unexpected error during signup:');
    console.error('[Auth]', err);
    throw err;
  }
}
