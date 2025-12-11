import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const listMessagesProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      otherUserId: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('List messages');

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    const messages = db.getMessagesBetweenUsers(session.userId, input.otherUserId);

    console.log('Messages found:', messages.length);
    return { messages };
  });
