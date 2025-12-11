import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';
import { supabase } from '@/lib/supabase';

export const blockUserProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      blockedId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Block user');

    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    if (user.id === input.blockedId) {
      throw new Error('Cannot block yourself');
    }

    const blockedUser = await db.getUserById(input.blockedId);
    if (!blockedUser) {
      throw new Error('User not found');
    }

    const existing = await db.getBlockedUser(user.id, input.blockedId);
    if (existing) {
      return { success: true, message: 'Already blocked' };
    }

    const block = await db.createBlockedUser({
      id: randomBytes(16).toString('hex'),
      blockerId: user.id,
      blockedId: input.blockedId,
      createdAt: new Date(),
    });

    console.log('User blocked:', block.id);
    return { success: true };
  });
