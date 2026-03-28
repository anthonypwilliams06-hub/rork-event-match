import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { getSupabase } from '@/lib/supabase';

const logoutSchema = z.object({
  token: z.string(),
});

export const logoutProcedure = publicProcedure
  .input(logoutSchema)
  .mutation(async () => {
    console.log('Logout attempt');

    await getSupabase().auth.signOut();

    console.log('Logout successful');

    return { success: true };
  });
