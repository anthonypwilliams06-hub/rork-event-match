import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { supabase } from '@/lib/supabase';

export const markReadProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      messageId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Mark message as read');

    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const message = await db.getMessageById(input.messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.receiverId !== user.id) {
      throw new Error('Unauthorized');
    }

    await db.markMessageAsRead(input.messageId);

    console.log('Message marked as read');
    return { success: true };
  });
