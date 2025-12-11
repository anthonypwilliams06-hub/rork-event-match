import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import bcrypt from 'bcryptjs';

const confirmResetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const confirmResetProcedure = publicProcedure
  .input(confirmResetSchema)
  .mutation(async ({ input }) => {
    console.log('Password reset confirmation');

    const resetToken = db.getResetToken(input.token);
    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    if (resetToken.expiresAt < new Date()) {
      db.deleteResetToken(input.token);
      throw new Error('Reset token has expired');
    }

    const user = db.getUserByEmail(resetToken.email);
    if (!user) {
      throw new Error('User not found');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    db.updateUser(user.id, { ...user, passwordHash } as any);

    db.deleteResetToken(input.token);

    console.log('Password reset successful');

    return { success: true };
  });
