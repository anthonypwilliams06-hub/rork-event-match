import { supabase, isSupabaseConfigured, getSupabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

export class APIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleSupabaseError(error: PostgrestError | null): never {
  if (!error) {
    throw new APIError('Unknown error occurred');
  }

  console.error('[API Error]', error.message, error.code, error.details);

  throw new APIError(
    error.message || 'Database operation failed',
    error.code,
    error.details
  );
}

export async function withErrorHandling<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T> {
  if (!isSupabaseConfigured || !supabase) {
    throw new APIError('Supabase is not configured');
  }

  try {
    const { data, error } = await operation();
    
    if (error) {
      handleSupabaseError(error);
    }
    
    if (data === null) {
      throw new APIError('No data returned from operation');
    }
    
    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    console.error('[API] Unexpected error:', error);
    throw new APIError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

export async function withOptionalData<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[API] Supabase is not configured');
    return null;
  }

  try {
    const { data, error } = await operation();
    
    if (error) {
      console.error('[API Error]', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return null;
  }
}

export const api = {
  users: {
    getById: async (id: string) =>
      withErrorHandling(async () =>
        getSupabase().from('users').select('*').eq('id', id).single()
      ),
    
    update: async (id: string, updates: Record<string, unknown>) =>
      withErrorHandling(async () =>
        getSupabase().from('users').update(updates).eq('id', id).select().single()
      ),

    getByIdOptional: async (id: string) =>
      withOptionalData(async () =>
        getSupabase().from('users').select('*').eq('id', id).single()
      ),
  },

  profiles: {
    getByUserId: async (userId: string) =>
      withErrorHandling(async () =>
        getSupabase().from('profiles').select('*').eq('user_id', userId).single()
      ),
    
    getByUserIdOptional: async (userId: string) =>
      withOptionalData(async () =>
        getSupabase().from('profiles').select('*').eq('user_id', userId).single()
      ),
    
    create: async (profile: Record<string, unknown>) =>
      withErrorHandling(async () =>
        getSupabase().from('profiles').insert(profile).select().single()
      ),
    
    update: async (userId: string, updates: Record<string, unknown>) =>
      withErrorHandling(async () =>
        getSupabase()
          .from('profiles')
          .update(updates)
          .eq('user_id', userId)
          .select()
          .single()
      ),
  },

  events: {
    list: async (filters?: { status?: string; category?: string; limit?: number }) => {
      const query = getSupabase()
        .from('events')
        .select('*, profiles!events_creator_id_fkey(*)')
        .eq('is_draft', false)
        .order('date', { ascending: true });

      const buildQuery = async () => {
        let q = query;
        if (filters?.status) {
          q = q.eq('status', filters.status);
        }
        if (filters?.category) {
          q = q.eq('category', filters.category);
        }
        if (filters?.limit) {
          q = q.limit(filters.limit);
        }
        return q;
      };

      return withErrorHandling(buildQuery);
    },

    getById: async (id: string) =>
      withErrorHandling(async () =>
        getSupabase()
          .from('events')
          .select('*, profiles!events_creator_id_fkey(*)')
          .eq('id', id)
          .single()
      ),

    getByIdOptional: async (id: string) =>
      withOptionalData(async () =>
        getSupabase()
          .from('events')
          .select('*, profiles!events_creator_id_fkey(*)')
          .eq('id', id)
          .single()
      ),

    create: async (event: Record<string, unknown>) =>
      withErrorHandling(async () =>
        getSupabase().from('events').insert(event).select().single()
      ),

    update: async (id: string, updates: Record<string, unknown>) =>
      withErrorHandling(async () =>
        getSupabase().from('events').update(updates).eq('id', id).select().single()
      ),

    delete: async (id: string) =>
      withOptionalData(async () => 
        getSupabase().from('events').delete().eq('id', id).select()
      ),
  },

  messages: {
    list: async (userId: string) =>
      withErrorHandling(async () =>
        getSupabase()
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false })
      ),

    send: async (message: { sender_id: string; receiver_id: string; content: string }) =>
      withErrorHandling(async () =>
        getSupabase().from('messages').insert(message).select().single()
      ),

    markAsRead: async (messageId: string) =>
      withOptionalData(async () =>
        getSupabase().from('messages').update({ read: true }).eq('id', messageId).select()
      ),

    getConversation: async (userId1: string, userId2: string) =>
      withErrorHandling(async () =>
        getSupabase()
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
          .order('created_at', { ascending: true })
      ),
  },

  favorites: {
    add: async (userId: string, eventId: string) =>
      withErrorHandling(async () =>
        getSupabase().from('favorites').insert({ user_id: userId, event_id: eventId }).select().single()
      ),

    remove: async (userId: string, eventId: string) =>
      withOptionalData(async () =>
        getSupabase().from('favorites').delete().eq('user_id', userId).eq('event_id', eventId).select()
      ),

    list: async (userId: string) =>
      withErrorHandling(async () =>
        getSupabase().from('favorites').select('*, events(*)').eq('user_id', userId)
      ),

    check: async (userId: string, eventId: string) =>
      withOptionalData(async () =>
        getSupabase().from('favorites').select('id').eq('user_id', userId).eq('event_id', eventId).single()
      ),
  },

  ratings: {
    create: async (rating: { user_id: string; event_id: string; score: number; comment?: string }) =>
      withErrorHandling(async () =>
        getSupabase().from('ratings').insert(rating).select().single()
      ),

    getForEvent: async (eventId: string) =>
      withErrorHandling(async () =>
        getSupabase().from('ratings').select('*, users(name)').eq('event_id', eventId).order('created_at', { ascending: false })
      ),

    getStats: async (eventId: string) =>
      withOptionalData(async () =>
        getSupabase().rpc('get_event_rating_stats', { p_event_id: eventId })
      ),
  },
};

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export function getErrorMessage(error: unknown): string {
  if (isAPIError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
