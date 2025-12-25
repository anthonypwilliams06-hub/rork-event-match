import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';
import { getSupabase } from '@/lib/supabase';

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
    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    console.log('Update notification settings for user:', user.id, input);
    
    let settings = await db.getNotificationSettings(user.id);
    
    if (!settings) {
      settings = {
        userId: user.id,
        newMessages: true,
        profileLikes: true,
        eventReminders: true,
        messageReplies: true,
        eventFillingUp: true,
        pushEnabled: false,
      };
    }
    
    const updated = await db.createOrUpdateNotificationSettings({
      ...settings,
      ...input,
      userId: user.id,
    });
    
    return { success: true, settings: updated };
  });
