import { supabase } from '@/lib/supabase';

type SignupInput = {
  email: string;
  password: string;
  name: string;
  dateOfBirth?: string;
};

export async function signupViaEdgeFunction(input: SignupInput) {
  const { email, password, name, dateOfBirth } = input;

  console.log('[Auth] Calling Edge Function signup with:', { email, name, dateOfBirth });

  const { data, error } = await supabase.functions.invoke('signup', {
    body: { email, password, name, dateOfBirth },
  });

  if (error) {
    console.error('[Auth] Edge function error:', error.message);
    throw new Error(error.message);
  }

  console.log('[Auth] Edge function response:', data);
  return data;
}
