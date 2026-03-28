import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { getSupabase } from '@/lib/supabase';

export const listVerificationsProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('List verification requests');

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const verifications = await db.getAllVerificationRequests();

    const verificationsWithDetails = await Promise.all(
      verifications.map(async (verification: typeof verifications[0]) => {
        const verUser = await db.getUserById(verification.userId);
        const verProfile = await db.getProfileByUserId(verification.userId);

        return {
          ...verification,
          userName: verUser?.name || 'Unknown',
          userEmail: verUser?.email || 'Unknown',
          userPhoto: verProfile?.photoUrl || null,
        };
      })
    );

    console.log('Verification requests fetched:', verificationsWithDetails.length);
    return verificationsWithDetails;
  });
