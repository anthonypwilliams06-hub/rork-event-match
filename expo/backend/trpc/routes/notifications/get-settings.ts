import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';
import { getSupabase } from '@/lib/supabase';

export const getSettingsProcedure = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    console.log('Get notification settings for user:', user.id);
    
    let settings = await db.getNotificationSettings(user.id);
    
    if (!settings) {
      settings = await db.createOrUpdateNotificationSettings({
        userId: user.id,
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
