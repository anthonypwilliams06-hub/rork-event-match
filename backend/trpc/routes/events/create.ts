import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['food_drink', 'outdoor', 'entertainment', 'sports', 'arts_culture', 'social', 'other'] as const),
  date: z.date(),
  time: z.string(),
  location: z.string().min(1),
  imageUrl: z.string().url(),
  capacity: z.number().min(1).optional(),
  isDraft: z.boolean().default(false),
  creatorId: z.string(),
});

export const createEventProcedure = publicProcedure
  .input(createEventSchema)
  .mutation(async ({ input }) => {
    const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const event = db.createEvent({
      id: eventId,
      ...input,
      spotsAvailable: input.capacity,
      status: input.isDraft ? 'draft' : 'upcoming',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Event created:', event.id);
    return event;
  });
