import { supabase } from '@/lib/supabase';

export async function invokeEdgeFunction<TResponse = any>(
  functionName: string,
  payload?: Record<string, unknown>
): Promise<TResponse> {
  console.log(`[Edge Function] Calling ${functionName} with:`, payload);

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload || {},
  });

  if (error) {
    console.error(`[Edge Function] ${functionName} error:`, error.message);
    throw new Error(error.message);
  }

  console.log(`[Edge Function] ${functionName} response:`, data);
  return data as TResponse;
}

export async function pingHealthcheck(payload?: Record<string, unknown>) {
  return invokeEdgeFunction('healthcheck', payload);
}

export async function callBackendFunction(payload?: Record<string, unknown>) {
  return invokeEdgeFunction('backend', payload);
}

export async function testSignUp(payload: { email: string; password: string; name: string; dateOfBirth?: string }) {
  return invokeEdgeFunction('sign_up', payload);
}

type EdgeFunctionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function safeInvokeEdgeFunction<TResponse = any>(
  functionName: string,
  payload?: Record<string, unknown>
): Promise<EdgeFunctionResponse<TResponse>> {
  try {
    const data = await invokeEdgeFunction<TResponse>(functionName, payload);
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Edge Function] ${functionName} failed:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}
