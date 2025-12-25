import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";
import { getSupabase } from '@/lib/supabase';

const checkInSchema = z.object({
  token: z.string(),
  eventId: z.string(),
});

export const checkInProcedure = publicProcedure
  .input(checkInSchema)
  .mutation(async ({ input }) => {
    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const safetyInfo = await db.getEventSafetyInfo(input.eventId, user.id);
    if (safetyInfo) {
      const updated = await db.updateEventSafetyInfo(safetyInfo.id, {
        checkInTime: new Date(),
      });
      console.log('User checked in:', user.id);
      return updated;
    }

    const safetyId = `safety-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSafety = await db.createEventSafetyInfo({
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
