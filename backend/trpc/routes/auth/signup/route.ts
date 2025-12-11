import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { supabase } from '@/lib/supabase';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  dateOfBirth: z.string().transform((str) => new Date(str)),
});

export const signupProcedure = publicProcedure
  .input(signupSchema)
  .mutation(async ({ input }) => {
    console.log('Signup attempt:', input.email);

    const birthDate = new Date(input.dateOfBirth);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    if (age < 18) {
      throw new Error('You must be at least 18 years old to create an account');
    }

    const existingUser = await db.getUserByEmail(input.email);
    if (existingUser) {
      throw new Error('An account with this email already exists');
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create account');
    }

    const createdUser = await db.createUser({
      id: authData.user.id,
      email: input.email,
      name: input.name,
      dateOfBirth: birthDate,
      age,
    });

    console.log('User created successfully:', createdUser.id);

    return {
      user: createdUser,
      session: authData.session,
    };
  });
