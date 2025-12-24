type SignupInput = {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
};

export async function signupViaHTTP(input: SignupInput) {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  
  if (!baseUrl) {
    throw new Error('Supabase URL not configured');
  }

  const url = `${baseUrl}/functions/v1/sign_up`;

  console.log('[Auth] Calling signup endpoint:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    console.log('[Auth] ✅ Signup successful');
    return data;
  } catch (error) {
    console.error('[Auth] ❌ Signup error:', error);
    throw error;
  }
}
