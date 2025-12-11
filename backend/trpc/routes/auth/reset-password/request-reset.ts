import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';

const resetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const requestResetProcedure = publicProcedure
  .input(resetRequestSchema)
  .mutation(async ({ input }) => {
    console.log('Password reset request:', input.email);

    const user = db.getUserByEmail(input.email);
    if (!user) {
      return { success: true };
    }

    const token = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    db.createResetToken({
      email: input.email,
      token,
      expiresAt,
    });

    console.log('Reset token created:', token);

    return { success: true, token };
  });
