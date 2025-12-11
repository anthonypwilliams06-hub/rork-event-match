import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { supabase } from '@/lib/supabase';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    console.log('Login attempt:', input.email);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (authError || !authData.user || !authData.session) {
      throw new Error('Invalid email or password');
    }

    let user = await db.getUserById(authData.user.id);
    if (!user) {
      user = await db.createUser({
        id: authData.user.id,
        email: input.email,
        name: authData.user.user_metadata?.name || input.email.split('@')[0],
        dateOfBirth: new Date(),
        age: 18,
      });
    }

    const profile = await db.getProfileByUserId(user.id);

    console.log('Login successful:', user.id);

    return {
      user: { ...user, profile },
      session: authData.session,
    };
  });
