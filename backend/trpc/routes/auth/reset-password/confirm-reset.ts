import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';

const confirmResetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const confirmResetProcedure = publicProcedure
  .input(confirmResetSchema)
  .mutation(async ({ input }) => {
    console.log('Password reset confirmation');

    const { error } = await supabase.auth.updateUser({
      password: input.newPassword,
    });

    if (error) {
      throw new Error('Failed to reset password: ' + error.message);
    }

    console.log('Password reset successful');

    return { success: true };
  });
