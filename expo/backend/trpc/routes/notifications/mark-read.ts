import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';
import { getSupabase } from '@/lib/supabase';

export const markReadProcedure = publicProcedure
  .input(z.object({
    token: z.string(),
    notificationId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    console.log('Mark notification as read:', input.notificationId);
    
    const notification = await db.getNotificationById(input.notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    if (notification.userId !== user.id) {
      throw new Error('Unauthorized');
    }
    
    const updated = await db.markNotificationAsRead(input.notificationId);
    
    return { success: true, notification: updated };
  });
