import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const unblockUserProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      blockedId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Unblock user');

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    const existing = db.getBlockedUser(session.userId, input.blockedId);
    if (!existing) {
      throw new Error('User is not blocked');
    }

    db.deleteBlockedUser(existing.id);

    console.log('User unblocked');
    return { success: true };
  });
