import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const getAnalyticsSchema = z.object({
  token: z.string(),
  eventId: z.string(),
});

export const getEventAnalyticsProcedure = publicProcedure
  .input(getAnalyticsSchema)
  .query(async ({ input }) => {
    const user = await db.getUserById(input.token);
    if (!user) {
      throw new Error('User not found');
    }

    const event = await db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.creatorId !== user.id) {
      throw new Error('Not authorized to view analytics');
    }

    const attendees = await db.getEventAttendees(input.eventId);
    const messages = await db.getMessagesBetweenUsers(user.id, event.creatorId);

    const revenue = attendees
      .filter((a: any) => a.paidAmount)
      .reduce((sum: number, a: any) => sum + (a.paidAmount || 0), 0);

    const conversionRate = event.views > 0 
      ? (attendees.length / event.views) * 100 
      : 0;

    return {
      eventId: event.id,
      views: event.views,
      likes: event.likes,
      messages: messages.length,
      attendees: attendees.length,
      revenue,
      conversionRate,
    };
  });
