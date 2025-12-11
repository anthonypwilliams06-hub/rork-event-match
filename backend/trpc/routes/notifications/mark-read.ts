import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';

export const markReadProcedure = publicProcedure
  .input(z.object({
    token: z.string(),
    notificationId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    console.log('Mark notification as read:', input.notificationId);
    
    const notification = db.getNotificationById(input.notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    if (notification.userId !== session.userId) {
      throw new Error('Unauthorized');
    }
    
    const updated = db.markNotificationAsRead(input.notificationId);
    
    return { success: true, notification: updated };
  });
