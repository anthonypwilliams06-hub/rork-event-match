import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const getVerificationStatusSchema = z.object({
  token: z.string().optional(),
  userId: z.string().optional(),
});

export const getVerificationStatusProcedure = publicProcedure
  .input(getVerificationStatusSchema)
  .query(async ({ input }) => {
    let userId = input.userId;

    if (input.token) {
      const session = db.getSession(input.token);
      if (session && session.expiresAt >= new Date()) {
        userId = session.userId;
      }
    }
    
    if (!userId) {
      throw new Error('User ID required');
    }

    const profile = db.getProfileByUserId(userId);
    const request = db.getVerificationRequestByUserId(userId);

    return {
      status: profile?.verificationStatus || 'unverified',
      photo: profile?.verificationPhoto,
      request: request,
    };
  });
