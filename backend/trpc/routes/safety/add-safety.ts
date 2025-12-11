import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";
import { supabase } from '@/lib/supabase';

const addEventSafetySchema = z.object({
  token: z.string(),
  eventId: z.string(),
  trustedContacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string().optional(),
  })),
});

export const addEventSafetyProcedure = publicProcedure
  .input(addEventSafetySchema)
  .mutation(async ({ input }) => {
    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const event = await db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const safetyId = `safety-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const safetyInfo = await db.createEventSafetyInfo({
      id: safetyId,
      eventId: input.eventId,
      userId: user.id,
      trustedContacts: input.trustedContacts,
      createdAt: new Date(),
    });

    console.log('Event safety info created:', safetyInfo.id);
    return safetyInfo;
  });
