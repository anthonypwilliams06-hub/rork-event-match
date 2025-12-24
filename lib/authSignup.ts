type SignupInput = {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
};

type SignupResponse = {
  success: boolean;
  error?: string;
  userId?: string;
  message?: string;
};

export async function signupViaHTTP(input: SignupInput): Promise<SignupResponse> {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  
  if (!baseUrl) {
    return { success: false, error: 'Supabase URL not configured' };
  }

  if (!anonKey) {
    return { success: false, error: 'Supabase anon key not configured' };
  }

  const url = `${baseUrl}/functions/v1/sign_up`;

  console.log('[Auth] Calling signup endpoint:', url);
  console.log('[Auth] Request body:', JSON.stringify(input, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    console.log('[Auth] Response status:', response.status);
    console.log('[Auth] Response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || `Signup failed with status ${response.status}` 
      };
    }

    console.log('[Auth] ✅ Signup successful');
    return { 
      success: true, 
      userId: data.userId,
      message: data.message 
    };
  } catch (error) {
    console.error('[Auth] ❌ Network or parsing error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during signup' 
    };
  }
}
