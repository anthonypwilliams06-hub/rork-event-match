import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';

export const updateSettingsProcedure = publicProcedure
  .input(z.object({
    token: z.string(),
    newMessages: z.boolean().optional(),
    profileLikes: z.boolean().optional(),
    eventReminders: z.boolean().optional(),
    messageReplies: z.boolean().optional(),
    eventFillingUp: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
  }))
  .mutation(async ({ input }) => {
    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    console.log('Update notification settings for user:', session.userId, input);
    
    let settings = db.getNotificationSettings(session.userId);
    
    if (!settings) {
      settings = {
        userId: session.userId,
        newMessages: true,
        profileLikes: true,
        eventReminders: true,
        messageReplies: true,
        eventFillingUp: true,
        pushEnabled: false,
      };
    }
    
    const updated = db.createOrUpdateNotificationSettings({
      ...settings,
      ...input,
    });
    
    return { success: true, settings: updated };
  });
