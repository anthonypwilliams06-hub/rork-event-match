import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const checkOutSchema = z.object({
  token: z.string(),
  eventId: z.string(),
});

export const checkOutProcedure = publicProcedure
  .input(checkOutSchema)
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
    if (!safetyInfo) {
      throw new Error('No check-in found');
    }

    const updated = db.updateEventSafetyInfo(safetyInfo.id, {
      checkOutTime: new Date(),
    });

    console.log('User checked out:', user.id);
    return updated;
  });
