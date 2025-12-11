import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const deleteEventSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
});

export const deleteEventProcedure = publicProcedure
  .input(deleteEventSchema)
  .mutation(async ({ input }) => {
    const event = db.getEventById(input.id);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    if (event.creatorId !== input.creatorId) {
      throw new Error('Unauthorized: You can only delete your own events');
    }
    
    const deleted = db.deleteEvent(input.id);
    
    if (!deleted) {
      throw new Error('Failed to delete event');
    }

    console.log('Event deleted:', input.id);
    return { success: true };
  });
