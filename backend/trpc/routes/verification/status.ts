import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";
import { supabase } from '@/lib/supabase';

const getVerificationStatusSchema = z.object({
  token: z.string().optional(),
  userId: z.string().optional(),
});

export const getVerificationStatusProcedure = publicProcedure
  .input(getVerificationStatusSchema)
  .query(async ({ input }) => {
    let userId = input.userId;

    if (input.token) {
      const { data: { user }, error } = await supabase.auth.getUser(input.token);
      if (!error && user) {
        userId = user.id;
      }
    }
    
    if (!userId) {
      throw new Error('User ID required');
    }

    const profile = await db.getProfileByUserId(userId);
    const request = await db.getVerificationRequestByUserId(userId);

    return {
      status: profile?.verificationStatus || 'unverified',
      photo: profile?.verificationPhoto,
      request: request,
    };
  });
