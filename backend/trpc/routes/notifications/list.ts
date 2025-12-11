import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';

export const listNotificationsProcedure = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    console.log('List notifications for user:', session.userId);
    
    const notifications = db.getNotificationsByUserId(session.userId);
    
    return notifications;
  });
