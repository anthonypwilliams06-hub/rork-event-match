import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { getSupabase } from '@/lib/supabase';

const resetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const requestResetProcedure = publicProcedure
  .input(resetRequestSchema)
  .mutation(async ({ input }) => {
    console.log('Password reset request:', input.email);

    const { error } = await getSupabase().auth.resetPasswordForEmail(input.email);

    if (error) {
      console.warn('Error requesting password reset:', error.message);
    }

    console.log('Password reset email sent (if account exists)');

    return { success: true };
  });
