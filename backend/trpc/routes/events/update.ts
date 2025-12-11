import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const updateEventSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.enum(['food_drink', 'outdoor', 'entertainment', 'sports', 'arts_culture', 'social', 'other'] as const).optional(),
  date: z.date().optional(),
  time: z.string().optional(),
  location: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  capacity: z.number().min(1).optional(),
  spotsAvailable: z.number().min(0).optional(),
  status: z.enum(['draft', 'upcoming', 'ongoing', 'completed', 'cancelled', 'full'] as const).optional(),
  isDraft: z.boolean().optional(),
});

export const updateEventProcedure = publicProcedure
  .input(updateEventSchema)
  .mutation(async ({ input }) => {
    const { id, ...updates } = input;
    
    const event = await db.updateEvent(id, updates);
    
    if (!event) {
      throw new Error('Event not found');
    }

    console.log('Event updated:', event.id);
    return event;
  });
