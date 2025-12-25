import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";
import { getSupabase } from '@/lib/supabase';

const requestVerificationSchema = z.object({
  token: z.string(),
  photoUrl: z.string().url(),
});

export const requestVerificationProcedure = publicProcedure
  .input(requestVerificationSchema)
  .mutation(async ({ input }) => {
    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const existingRequest = await db.getVerificationRequestByUserId(user.id);
    if (existingRequest && existingRequest.status === 'pending') {
      throw new Error('Verification request already pending');
    }

    const requestId = `verification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const request = await db.createVerificationRequest({
      id: requestId,
      userId: user.id,
      photoUrl: input.photoUrl,
      status: 'pending',
      createdAt: new Date(),
    });

    await db.updateProfile(user.id, {
      verificationPhoto: input.photoUrl,
      verificationStatus: 'pending',
    });

    console.log('Verification request created:', request.id);
    return request;
  });
