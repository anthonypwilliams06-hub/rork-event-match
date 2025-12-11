import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';

const logoutSchema = z.object({
  token: z.string(),
});

export const logoutProcedure = publicProcedure
  .input(logoutSchema)
  .mutation(async () => {
    console.log('Logout attempt');

    await supabase.auth.signOut();

    console.log('Logout successful');

    return { success: true };
  });
