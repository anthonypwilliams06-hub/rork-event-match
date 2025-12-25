import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';
import { getSupabase } from '@/lib/supabase';

export const muteUserProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      mutedId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Mute user');

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    if (user.id === input.mutedId) {
      throw new Error('Cannot mute yourself');
    }

    const mutedUser = await db.getUserById(input.mutedId);
    if (!mutedUser) {
      throw new Error('User not found');
    }

    const existing = await db.getMutedUser(user.id, input.mutedId);
    if (existing) {
      return { success: true, message: 'Already muted' };
    }

    const mute = await db.createMutedUser({
      id: randomBytes(16).toString('hex'),
      muterId: user.id,
      mutedId: input.mutedId,
      createdAt: new Date(),
    });

    console.log('User muted:', mute.id);
    return { success: true };
  });
