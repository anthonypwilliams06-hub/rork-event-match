import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';

export const markAllReadProcedure = publicProcedure
  .input(z.object({ token: z.string() }))
  .mutation(async ({ input }) => {
    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    console.log('Mark all notifications as read for user:', session.userId);
    
    db.markAllNotificationsAsRead(session.userId);
    
    return { success: true };
  });
