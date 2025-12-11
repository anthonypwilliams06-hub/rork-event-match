import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

const getProfileSchema = z.object({
  userId: z.string(),
});

export const getProfileProcedure = publicProcedure
  .input(getProfileSchema)
  .query(async ({ input }) => {
    console.log('Get profile for user:', input.userId);

    const profile = await db.getProfileByUserId(input.userId);
    return profile;
  });
