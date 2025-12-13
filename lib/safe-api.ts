import { supabase, isSupabaseConfigured, SupabaseError } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'CONFLICT'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

export interface SafeAPIError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  details?: string;
  recoverable: boolean;
  retryable: boolean;
}

export interface SafeResult<T> {
  data: T | null;
  error: SafeAPIError | null;
  success: boolean;
}

const ERROR_MESSAGES: Record<ErrorCode, { title: string; description: string }> = {
  NETWORK_ERROR: {
    title: 'Connection Failed',
    description: 'Please check your internet connection and try again.',
  },
  AUTH_ERROR: {
    title: 'Authentication Required',
    description: 'Please sign in to continue.',
  },
  NOT_FOUND: {
    title: 'Not Found',
    description: 'The item you\'re looking for doesn\'t exist or has been removed.',
  },
  VALIDATION_ERROR: {
    title: 'Invalid Input',
    description: 'Please check your input and try again.',
  },
  PERMISSION_DENIED: {
    title: 'Access Denied',
    description: 'You don\'t have permission to perform this action.',
  },
  RATE_LIMITED: {
    title: 'Too Many Requests',
    description: 'Please wait a moment before trying again.',
  },
  SERVER_ERROR: {
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again later.',
  },
  CONFLICT: {
    title: 'Conflict',
    description: 'This action conflicts with existing data.',
  },
  NOT_CONFIGURED: {
    title: 'Service Unavailable',
    description: 'The service is not properly configured.',
  },
  UNKNOWN: {
    title: 'Unexpected Error',
    description: 'Something went wrong. Please try again.',
  },
};

function categorizeError(error: PostgrestError | SupabaseError | Error | string): ErrorCode {
  const errorObj = typeof error === 'string' ? { message: error, code: '' } : error;
  const message = errorObj.message?.toLowerCase() || '';
  const code = ('code' in errorObj ? errorObj.code : '') || '';

  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'NETWORK_ERROR';
  }

  if (message.includes('jwt') || message.includes('token') || message.includes('session') ||
      message.includes('unauthorized') || code.startsWith('AUTH') || code === 'PGRST301') {
    return 'AUTH_ERROR';
  }

  if (code === 'PGRST116' || code === '404' || message.includes('not found') || 
      message.includes('no rows')) {
    return 'NOT_FOUND';
  }

  if (code === '23505' || message.includes('duplicate') || message.includes('already exists')) {
    return 'CONFLICT';
  }

  if (code === '23503' || code === '23502' || message.includes('violates') || 
      message.includes('invalid input') || message.includes('validation')) {
    return 'VALIDATION_ERROR';
  }

  if (code === '42501' || message.includes('permission') || message.includes('denied') ||
      message.includes('policy')) {
    return 'PERMISSION_DENIED';
  }

  if (code === '429' || message.includes('rate limit') || message.includes('too many')) {
    return 'RATE_LIMITED';
  }

  if (code?.startsWith('5') || message.includes('internal') || message.includes('server error')) {
    return 'SERVER_ERROR';
  }

  return 'UNKNOWN';
}

function createSafeError(
  error: PostgrestError | SupabaseError | Error | string,
  customMessage?: string
): SafeAPIError {
  const code = categorizeError(error);
  const errorInfo = ERROR_MESSAGES[code];
  const originalMessage = typeof error === 'string' ? error : error.message;

  return {
    code,
    message: originalMessage,
    userMessage: customMessage || errorInfo.description,
    details: typeof error === 'object' && 'details' in error ? (error as PostgrestError).details || undefined : undefined,
    recoverable: ['NETWORK_ERROR', 'RATE_LIMITED', 'SERVER_ERROR'].includes(code),
    retryable: ['NETWORK_ERROR', 'RATE_LIMITED', 'SERVER_ERROR', 'AUTH_ERROR'].includes(code),
  };
}

export function getErrorTitle(error: SafeAPIError): string {
  return ERROR_MESSAGES[error.code].title;
}

export function getActionableMessage(error: SafeAPIError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Check your connection and tap to retry';
    case 'AUTH_ERROR':
      return 'Tap to sign in';
    case 'RATE_LIMITED':
      return 'Wait a moment, then tap to retry';
    case 'SERVER_ERROR':
      return 'Tap to retry';
    default:
      return error.userMessage;
  }
}

interface SafeCallOptions {
  retries?: number;
  retryDelay?: number;
  customErrorMessage?: string;
  silent?: boolean;
}

export async function safeCall<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: SafeCallOptions = {}
): Promise<SafeResult<T>> {
  const { retries = 2, retryDelay = 1000, customErrorMessage, silent = false } = options;

  if (!isSupabaseConfigured || !supabase) {
    const error = createSafeError('Supabase is not configured');
    error.code = 'NOT_CONFIGURED';
    if (!silent) {
      console.warn('[SafeAPI] Service not configured');
    }
    return { data: null, error, success: false };
  }

  let lastError: SafeAPIError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await operation();

      if (error) {
        lastError = createSafeError(error, customErrorMessage);

        if (!lastError.retryable || attempt === retries) {
          if (!silent) {
            console.error(`[SafeAPI] Operation failed:`, {
              code: lastError.code,
              message: lastError.message,
              attempt: attempt + 1,
            });
          }
          return { data: null, error: lastError, success: false };
        }

        if (!silent) {
          console.warn(`[SafeAPI] Retry ${attempt + 1}/${retries}: ${lastError.code}`);
        }
        await delay(retryDelay * (attempt + 1));
        continue;
      }

      return { data, error: null, success: true };
    } catch (err) {
      lastError = createSafeError(
        err instanceof Error ? err : String(err),
        customErrorMessage
      );

      if (attempt === retries) {
        if (!silent) {
          console.error(`[SafeAPI] Unexpected error after ${retries + 1} attempts:`, err);
        }
        return { data: null, error: lastError, success: false };
      }

      await delay(retryDelay * (attempt + 1));
    }
  }

  return { 
    data: null, 
    error: lastError || createSafeError('Operation failed after retries'), 
    success: false 
  };
}

export async function safeCallRequired<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: SafeCallOptions = {}
): Promise<SafeResult<T>> {
  const result = await safeCall(operation, options);

  if (result.success && result.data === null) {
    return {
      data: null,
      error: createSafeError('No data returned', options.customErrorMessage || 'Expected data was not found'),
      success: false,
    };
  }

  return result;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const safeApi = {
  profiles: {
    get: async (userId: string) =>
      safeCallRequired(
        async () => supabase.from('profiles').select('*').eq('user_id', userId).single(),
        { customErrorMessage: 'Could not load profile' }
      ),

    getOptional: async (userId: string) =>
      safeCall(
        async () => supabase.from('profiles').select('*').eq('user_id', userId).single(),
        { customErrorMessage: 'Could not load profile', silent: true }
      ),

    create: async (profile: Record<string, unknown>) =>
      safeCallRequired(
        async () => supabase.from('profiles').insert(profile).select().single(),
        { customErrorMessage: 'Could not create profile' }
      ),

    update: async (userId: string, updates: Record<string, unknown>) =>
      safeCallRequired(
        async () => supabase.from('profiles').update(updates).eq('user_id', userId).select().single(),
        { customErrorMessage: 'Could not update profile' }
      ),
  },

  events: {
    list: async (filters?: { status?: string; category?: string; limit?: number }) => {
      let query = supabase
        .from('events')
        .select('*, profiles!events_creator_id_fkey(*)')
        .eq('is_draft', false)
        .order('date', { ascending: true });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.limit) query = query.limit(filters.limit);

      return safeCall(async () => query, { customErrorMessage: 'Could not load events' });
    },

    get: async (id: string) =>
      safeCallRequired(
        async () => supabase.from('events').select('*, profiles!events_creator_id_fkey(*)').eq('id', id).single(),
        { customErrorMessage: 'Could not load event details' }
      ),

    create: async (event: Record<string, unknown>) =>
      safeCallRequired(
        async () => supabase.from('events').insert(event).select().single(),
        { customErrorMessage: 'Could not create event' }
      ),

    update: async (id: string, updates: Record<string, unknown>) =>
      safeCallRequired(
        async () => supabase.from('events').update(updates).eq('id', id).select().single(),
        { customErrorMessage: 'Could not update event' }
      ),

    delete: async (id: string) =>
      safeCall(
        async () => supabase.from('events').delete().eq('id', id).select(),
        { customErrorMessage: 'Could not delete event' }
      ),
  },

  messages: {
    list: async (userId: string) =>
      safeCall(
        async () => supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }),
        { customErrorMessage: 'Could not load messages' }
      ),

    send: async (message: { sender_id: string; receiver_id: string; content: string }) =>
      safeCallRequired(
        async () => supabase.from('messages').insert(message).select().single(),
        { customErrorMessage: 'Could not send message', retries: 1 }
      ),

    getConversation: async (userId1: string, userId2: string) =>
      safeCall(
        async () => supabase.from('messages').select('*').or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`).order('created_at', { ascending: true }),
        { customErrorMessage: 'Could not load conversation' }
      ),

    markAsRead: async (messageId: string) =>
      safeCall(
        async () => supabase.from('messages').update({ read: true }).eq('id', messageId).select(),
        { customErrorMessage: 'Could not mark message as read', silent: true }
      ),
  },

  favorites: {
    add: async (userId: string, eventId: string) =>
      safeCallRequired(
        async () => supabase.from('favorites').insert({ user_id: userId, event_id: eventId }).select().single(),
        { customErrorMessage: 'Could not add to favorites' }
      ),

    remove: async (userId: string, eventId: string) =>
      safeCall(
        async () => supabase.from('favorites').delete().eq('user_id', userId).eq('event_id', eventId).select(),
        { customErrorMessage: 'Could not remove from favorites' }
      ),

    list: async (userId: string) =>
      safeCall(
        async () => supabase.from('favorites').select('*, events(*)').eq('user_id', userId),
        { customErrorMessage: 'Could not load favorites' }
      ),

    check: async (userId: string, eventId: string) =>
      safeCall(
        async () => supabase.from('favorites').select('id').eq('user_id', userId).eq('event_id', eventId).maybeSingle(),
        { silent: true }
      ),
  },

  ratings: {
    create: async (rating: { user_id: string; event_id: string; score: number; comment?: string }) =>
      safeCallRequired(
        async () => supabase.from('ratings').insert(rating).select().single(),
        { customErrorMessage: 'Could not submit rating' }
      ),

    getForEvent: async (eventId: string) =>
      safeCall(
        async () => supabase.from('ratings').select('*, profiles(name, avatar_url)').eq('event_id', eventId).order('created_at', { ascending: false }),
        { customErrorMessage: 'Could not load ratings' }
      ),
  },

  notifications: {
    list: async (userId: string) =>
      safeCall(
        async () => supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        { customErrorMessage: 'Could not load notifications' }
      ),

    markAsRead: async (notificationId: string) =>
      safeCall(
        async () => supabase.from('notifications').update({ read: true }).eq('id', notificationId).select(),
        { silent: true }
      ),

    markAllAsRead: async (userId: string) =>
      safeCall(
        async () => supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false).select(),
        { customErrorMessage: 'Could not mark notifications as read' }
      ),
  },
};

export function isSafeAPIError(error: unknown): error is SafeAPIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'userMessage' in error
  );
}

export function handleSafeError(result: SafeResult<unknown>): string {
  if (!result.error) return '';
  return result.error.userMessage;
}
