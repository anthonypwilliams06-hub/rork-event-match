import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';

export const getSettingsProcedure = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    console.log('Get notification settings for user:', session.userId);
    
    let settings = db.getNotificationSettings(session.userId);
    
    if (!settings) {
      settings = db.createOrUpdateNotificationSettings({
        userId: session.userId,
        newMessages: true,
        profileLikes: true,
        eventReminders: true,
        messageReplies: true,
        eventFillingUp: true,
        pushEnabled: false,
      });
    }
    
    return settings;
  });
