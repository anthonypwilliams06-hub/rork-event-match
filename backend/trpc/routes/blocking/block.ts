import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';

export const blockUserProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      blockedId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Block user');

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    if (session.userId === input.blockedId) {
      throw new Error('Cannot block yourself');
    }

    const blockedUser = db.getUserById(input.blockedId);
    if (!blockedUser) {
      throw new Error('User not found');
    }

    const existing = db.getBlockedUser(session.userId, input.blockedId);
    if (existing) {
      return { success: true, message: 'Already blocked' };
    }

    const block = db.createBlockedUser({
      id: randomBytes(16).toString('hex'),
      blockerId: session.userId,
      blockedId: input.blockedId,
      createdAt: new Date(),
    });

    console.log('User blocked:', block.id);
    return { success: true };
  });
