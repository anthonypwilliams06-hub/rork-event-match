import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const requestVerificationSchema = z.object({
  token: z.string(),
  photoUrl: z.string().url(),
});

export const requestVerificationProcedure = publicProcedure
  .input(requestVerificationSchema)
  .mutation(async ({ input }) => {
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

    const existingRequest = db.getVerificationRequestByUserId(user.id);
    if (existingRequest && existingRequest.status === 'pending') {
      throw new Error('Verification request already pending');
    }

    const requestId = `verification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const request = db.createVerificationRequest({
      id: requestId,
      userId: user.id,
      photoUrl: input.photoUrl,
      status: 'pending',
      createdAt: new Date(),
    });

    db.updateProfile(user.id, {
      verificationPhoto: input.photoUrl,
      verificationStatus: 'pending',
    });

    console.log('Verification request created:', request.id);
    return request;
  });
