import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';
import { getSupabase } from '@/lib/supabase';

export const listNotificationsProcedure = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    console.log('List notifications for user:', user.id);
    
    const notifications = await db.getNotificationsByUserId(user.id);
    
    return notifications;
  });
