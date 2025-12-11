import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const checkInSchema = z.object({
  token: z.string(),
  eventId: z.string(),
});

export const checkInProcedure = publicProcedure
  .input(checkInSchema)
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

    const safetyInfo = db.getEventSafetyInfo(input.eventId, user.id);
    if (safetyInfo) {
      const updated = db.updateEventSafetyInfo(safetyInfo.id, {
        checkInTime: new Date(),
      });
      console.log('User checked in:', user.id);
      return updated;
    }

    const safetyId = `safety-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSafety = db.createEventSafetyInfo({
      id: safetyId,
      eventId: input.eventId,
      userId: user.id,
      trustedContacts: [],
      checkInTime: new Date(),
      createdAt: new Date(),
    });

    console.log('User checked in (new):', user.id);
    return newSafety;
  });
