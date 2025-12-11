import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';
import { supabase } from '@/lib/supabase';

export const markAllReadProcedure = publicProcedure
  .input(z.object({ token: z.string() }))
  .mutation(async ({ input }) => {
    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    console.log('Mark all notifications as read for user:', user.id);
    
    await db.markAllNotificationsAsRead(user.id);
    
    return { success: true };
  });
