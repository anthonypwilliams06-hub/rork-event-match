import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const joinEventSchema = z.object({
  token: z.string(),
  eventId: z.string(),
  status: z.enum(['going', 'interested', 'not_going']).default('interested'),
});

export const joinEventProcedure = publicProcedure
  .input(joinEventSchema)
  .mutation(async ({ input }) => {
    const user = await db.getUserById(input.token);
    if (!user) {
      throw new Error('User not found');
    }

    const event = await db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.spotsAvailable !== undefined && event.spotsAvailable <= 0) {
      throw new Error('Event is full');
    }

    const existing = await db.getUserAttendance(user.id, input.eventId);
    if (existing) {
      throw new Error('Already registered for this event');
    }

    const attendeeId = `attendee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const attendee = await db.createEventAttendee({
      id: attendeeId,
      eventId: input.eventId,
      userId: user.id,
      status: input.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (event.spotsAvailable !== undefined) {
      await db.updateEvent(input.eventId, {
        spotsAvailable: event.spotsAvailable - 1,
        attendeeIds: [...event.attendeeIds, user.id],
        status: event.spotsAvailable - 1 === 0 ? 'full' : event.status,
      });
    } else {
      await db.updateEvent(input.eventId, {
        attendeeIds: [...event.attendeeIds, user.id],
      });
    }

    console.log('User joined event:', user.id, input.eventId);
    return attendee;
  });
