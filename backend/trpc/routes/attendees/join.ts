import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const joinEventSchema = z.object({
  token: z.string(),
  eventId: z.string(),
  status: z.enum(['interested', 'attending']).default('interested'),
});

export const joinEventProcedure = publicProcedure
  .input(joinEventSchema)
  .mutation(async ({ input }) => {
    const session = db.getSession(input.token);
    if (!session) {
      throw new Error('Invalid session');
    }

    if (session.expiresAt < new Date()) {
      db.deleteSession(input.token);
      throw new Error('Session expired');
    }

    const user = db.getUserById(session.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const event = db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.spotsAvailable !== undefined && event.spotsAvailable <= 0) {
      throw new Error('Event is full');
    }

    const existing = db.getUserAttendance(user.id, input.eventId);
    if (existing) {
      throw new Error('Already registered for this event');
    }

    const attendeeId = `attendee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const attendee = db.createEventAttendee({
      id: attendeeId,
      eventId: input.eventId,
      userId: user.id,
      status: input.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (event.spotsAvailable !== undefined) {
      db.updateEvent(input.eventId, {
        spotsAvailable: event.spotsAvailable - 1,
        attendeeIds: [...event.attendeeIds, user.id],
        status: event.spotsAvailable - 1 === 0 ? 'full' : event.status,
      });
    } else {
      db.updateEvent(input.eventId, {
        attendeeIds: [...event.attendeeIds, user.id],
      });
    }

    console.log('User joined event:', user.id, input.eventId);
    return attendee;
  });
