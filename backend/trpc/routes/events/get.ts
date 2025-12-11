import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const getEventSchema = z.object({
  id: z.string(),
});

export const getEventProcedure = publicProcedure
  .input(getEventSchema)
  .query(async ({ input }) => {
    const event = db.getEventById(input.id);
    
    if (!event) {
      throw new Error('Event not found');
    }

    console.log('Event retrieved:', event.id);
    return event;
  });
