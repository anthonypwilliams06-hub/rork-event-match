import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '@/backend/db';
import { supabase } from '@/lib/supabase';

export const registerTokenProcedure = publicProcedure
  .input(z.object({
    sessionToken: z.string(),
    pushToken: z.string(),
  }))
  .mutation(async ({ input }) => {
    const { data: { user }, error } = await supabase.auth.getUser(input.sessionToken);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    console.log('Register push token for user:', user.id, input.pushToken);
    
    await db.updateUser(user.id, { pushToken: input.pushToken });
    
    return { success: true };
  });
