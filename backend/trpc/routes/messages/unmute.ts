import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { getSupabase } from '@/lib/supabase';

export const unmuteUserProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      mutedId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Unmute user');

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const muted = await db.getMutedUser(user.id, input.mutedId);
    if (!muted) {
      return { success: true, message: 'User was not muted' };
    }

    await db.deleteMutedUser(muted.id);

    console.log('User unmuted');
    return { success: true };
  });
