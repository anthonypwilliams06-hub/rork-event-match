import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { supabase } from '@/lib/supabase';

export const listMessagesProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      otherUserId: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('List messages');

    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const messages = await db.getMessagesBetweenUsers(user.id, input.otherUserId);

    console.log('Messages found:', messages.length);
    return { messages };
  });
