import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { UserProfile } from '@/types';

const createProfileSchema = z.object({
  token: z.string(),
  role: z.enum(['creator', 'seeker']),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  interests: z.array(z.string()),
  personalityTraits: z.array(z.string()),
  relationshipGoal: z.enum(['casual', 'serious', 'friendship', 'open']).optional(),
  location: z.string(),
  ageRangeMin: z.number().optional(),
  ageRangeMax: z.number().optional(),
});

export const createProfileProcedure = publicProcedure
  .input(createProfileSchema)
  .mutation(async ({ input }) => {
    console.log('Create profile attempt');

    const session = db.getSession(input.token);
    if (!session) {
      throw new Error('Invalid session');
    }

    if (session.expiresAt < new Date()) {
      db.deleteSession(input.token);
      throw new Error('Session expired');
    }

    const user = db.getUserById(session.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const existingProfile = db.getProfileByUserId(user.id);
    if (existingProfile) {
      throw new Error('Profile already exists');
    }

    const profile: UserProfile = {
      userId: user.id,
      role: input.role,
      bio: input.bio,
      photoUrl: input.photoUrl,
      interests: input.interests,
      personalityTraits: input.personalityTraits,
      relationshipGoal: input.relationshipGoal,
      location: input.location,
      ageRangeMin: input.ageRangeMin,
      ageRangeMax: input.ageRangeMax,
    };

    const createdProfile = db.createProfile(profile);

    console.log('Profile created successfully');

    return { profile: createdProfile };
  });
