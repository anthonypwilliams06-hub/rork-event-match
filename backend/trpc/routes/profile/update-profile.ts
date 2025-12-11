import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { UserProfile } from '@/types';

const updateProfileSchema = z.object({
  token: z.string(),
  bio: z.string().max(500).optional(),
  photoUrl: z.string().optional(),
  interests: z.array(z.string()).optional(),
  personalityTraits: z.array(z.string()).optional(),
  relationshipGoal: z.enum(['casual', 'serious', 'friendship', 'open']).optional(),
  location: z.string().optional(),
  ageRangeMin: z.number().optional(),
  ageRangeMax: z.number().optional(),
});

export const updateProfileProcedure = publicProcedure
  .input(updateProfileSchema)
  .mutation(async ({ input }) => {
    console.log('Update profile attempt');

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
    if (!existingProfile) {
      throw new Error('Profile not found');
    }

    const updates: Partial<UserProfile> = {};
    if (input.bio !== undefined) updates.bio = input.bio;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;
    if (input.interests !== undefined) updates.interests = input.interests;
    if (input.personalityTraits !== undefined) updates.personalityTraits = input.personalityTraits;
    if (input.relationshipGoal !== undefined) updates.relationshipGoal = input.relationshipGoal;
    if (input.location !== undefined) updates.location = input.location;
    if (input.ageRangeMin !== undefined) updates.ageRangeMin = input.ageRangeMin;
    if (input.ageRangeMax !== undefined) updates.ageRangeMax = input.ageRangeMax;

    const updatedProfile = db.updateProfile(user.id, updates);

    if (!updatedProfile) {
      throw new Error('Failed to update profile');
    }

    console.log('Profile updated successfully');

    return { profile: updatedProfile };
  });
