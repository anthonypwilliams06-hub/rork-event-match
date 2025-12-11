import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";
import { supabase } from '@/lib/supabase';

const checkOutSchema = z.object({
  token: z.string(),
  eventId: z.string(),
});

export const checkOutProcedure = publicProcedure
  .input(checkOutSchema)
  .mutation(async ({ input }) => {
    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const safetyInfo = await db.getEventSafetyInfo(input.eventId, user.id);
    if (!safetyInfo) {
      throw new Error('No check-in found');
    }

    const updated = await db.updateEventSafetyInfo(safetyInfo.id, {
      checkOutTime: new Date(),
    });

    console.log('User checked out:', user.id);
    return updated;
  });
