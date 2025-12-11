import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { supabase } from '@/lib/supabase';

export const unblockUserProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      blockedId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Unblock user');

    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const existing = await db.getBlockedUser(user.id, input.blockedId);
    if (!existing) {
      throw new Error('User is not blocked');
    }

    await db.deleteBlockedUser(existing.id);

    console.log('User unblocked');
    return { success: true };
  });
