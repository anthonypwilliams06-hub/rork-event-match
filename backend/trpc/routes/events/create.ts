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
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().min(1),
  capacity: z.number().min(1).optional(),
  vibes: z.array(z.enum(['chill', 'adventurous', 'romantic', 'social', 'intimate', 'energetic', 'cultural', 'fun'] as const)).default([]),
  isDraft: z.boolean().default(false),
  isPaid: z.boolean().default(false),
  price: z.number().min(0).optional(),
  currency: z.string().default('USD').optional(),
  creatorId: z.string(),
});

export const createEventProcedure = publicProcedure
  .input(createEventSchema)
  .mutation(async ({ input }) => {
    const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const event = await db.createEvent({
      id: eventId,
      ...input,
      spotsAvailable: input.capacity,
      attendeeIds: [],
      status: input.isDraft ? 'draft' : 'upcoming',
      views: 0,
      likes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Event created:', event.id);
    return event;
  });
