import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (apiUrl) {
    return apiUrl;
  }
  
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return 'http://localhost:3000';
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch: async (url, options) => {
        console.log('[tRPC] Request:', url);
        console.log('[tRPC] Base URL:', getBaseUrl());
        
        try {
          const response = await fetch(url, options);
          console.log('[tRPC] Response status:', response.status);
          console.log('[tRPC] Response headers:', {
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'),
          });
          
          const clonedResponse = response.clone();
          const text = await clonedResponse.text();
          console.log('[tRPC] Raw response (first 500 chars):', text.substring(0, 500));
          
          if (!response.ok) {
            console.error('[tRPC] Response not OK:', response.status, response.statusText);
          }
          
          const contentType = response.headers.get('content-type');
          if (contentType && !contentType.includes('application/json')) {
            console.error('[tRPC] ❌ Expected JSON but got:', contentType);
            console.error('[tRPC] Full response:', text);
            throw new Error(`Server returned ${contentType} instead of JSON. Check if backend is running at ${getBaseUrl()}`);
          }
          
          return response;
        } catch (error) {
          console.error('[tRPC] Fetch error:', error);
          if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            throw new Error(`Cannot reach server at ${getBaseUrl()}. Make sure backend is running.`);
          }
          throw error;
        }
      },
    }),
  ],
});
