import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, serverAuth } from '../../../../db';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    console.log('[Login] Attempt for:', input.email);

    const { user: authUser, session } = await serverAuth.signIn(input.email, input.password);

    if (!authUser || !session) {
      throw new Error('Invalid email or password');
    }

    console.log('[Login] Auth successful:', authUser.id);

    let user = await db.getUserById(authUser.id);
    if (!user) {
      console.log('[Login] Creating user record for:', authUser.id);
      user = await db.createUser({
        id: authUser.id,
        email: input.email,
        name: authUser.user_metadata?.name || input.email.split('@')[0],
        dateOfBirth: new Date(),
        age: 18,
      });
    }

    const profile = await db.getProfileByUserId(user.id);

    console.log('[Login] Complete for:', user.id);

    return {
      user: { ...user, profile },
      session,
    };
  });
