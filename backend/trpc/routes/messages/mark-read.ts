import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const markReadProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      messageId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Mark message as read');

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    const message = db.getMessageById(input.messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.receiverId !== session.userId) {
      throw new Error('Unauthorized');
    }

    db.markMessageAsRead(input.messageId);

    console.log('Message marked as read');
    return { success: true };
  });
