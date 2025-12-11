import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    console.log('Login attempt:', input.email);

    const user = db.getUserByEmail(input.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    db.createSession({
      userId: user.id,
      token,
      expiresAt,
    });

    const profile = db.getProfileByUserId(user.id);

    const { passwordHash: _, ...userWithoutPassword } = user;

    console.log('Login successful:', user.id);

    return {
      user: { ...userWithoutPassword, profile },
      token,
      expiresAt,
    };
  });
