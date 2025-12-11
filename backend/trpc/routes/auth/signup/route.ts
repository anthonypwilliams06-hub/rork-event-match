import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { User } from '@/types';
import bcrypt from 'bcryptjs';

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

    const existingUser = db.getUserByEmail(input.email);
    if (existingUser) {
      throw new Error('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user: User & { passwordHash: string } = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: input.email,
      name: input.name,
      dateOfBirth: birthDate,
      age,
      createdAt: new Date(),
      passwordHash,
    };

    const createdUser = db.createUser(user);

    const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    db.createSession({
      userId: createdUser.id,
      token,
      expiresAt,
    });

    const { passwordHash: _, ...userWithoutPassword } = createdUser;

    console.log('User created successfully:', userWithoutPassword.id);

    return {
      user: userWithoutPassword,
      token,
      expiresAt,
    };
  });
