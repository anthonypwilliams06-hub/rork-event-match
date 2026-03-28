import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { getSupabase } from '@/lib/supabase';

export const approveVerificationProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      requestId: z.string(),
      approved: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Process verification:', input.requestId, input.approved);

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const request = await db.getVerificationRequestById(input.requestId);
    if (!request) {
      throw new Error('Verification request not found');
    }

    await db.updateVerificationRequest(input.requestId, {
      status: input.approved ? 'approved' : 'rejected',
    });

    await db.updateProfile(request.userId, {
      verificationStatus: input.approved ? 'verified' : 'unverified',
    });

    console.log('Verification processed:', input.requestId, input.approved ? 'approved' : 'rejected');
    return { success: true };
  });
