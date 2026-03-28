import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const updateRSVPSchema = z.object({
  token: z.string(),
  eventId: z.string(),
  status: z.enum(['going', 'interested', 'not_going']),
});

export const updateRSVPProcedure = publicProcedure
  .input(updateRSVPSchema)
  .mutation(async ({ input }) => {
    const user = await db.getUserById(input.token);
    if (!user) {
      throw new Error('User not found');
    }

    const event = await db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const existing = await db.getUserAttendance(user.id, input.eventId);
    
    if (!existing) {
      if (input.status === 'not_going') {
        return { success: true, message: 'No RSVP to update' };
      }

      const shouldAddToWaitlist = 
        event.capacity && 
        event.spotsAvailable !== undefined && 
        event.spotsAvailable <= 0 && 
        input.status === 'going';

      const attendeeId = `attendee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const attendee = await db.createEventAttendee({
        id: attendeeId,
        eventId: input.eventId,
        userId: user.id,
        status: shouldAddToWaitlist ? 'waitlist' : input.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (shouldAddToWaitlist) {
        console.log('User added to waitlist:', user.id, input.eventId);
        return { success: true, attendee, waitlisted: true };
      }

      if (input.status === 'going' && event.spotsAvailable !== undefined) {
        await db.updateEvent(input.eventId, {
          spotsAvailable: event.spotsAvailable - 1,
          attendeeIds: [...event.attendeeIds, user.id],
          status: event.spotsAvailable - 1 === 0 ? 'full' : event.status,
        });
      }

      console.log('User RSVP created:', user.id, input.eventId, input.status);
      return { success: true, attendee, waitlisted: false };
    }

    const previousStatus = existing.status;

    if (input.status === 'not_going') {
      if (previousStatus === 'going') {
        const newSpotsAvailable = (event.spotsAvailable ?? 0) + 1;
        await db.updateEvent(input.eventId, {
          spotsAvailable: newSpotsAvailable,
          attendeeIds: event.attendeeIds.filter(id => id !== user.id),
          status: event.status === 'full' ? 'upcoming' : event.status,
        });
      }
      
      await db.updateEventAttendee(existing.id, {
        status: 'not_going',
      });

      console.log('User RSVP updated to not_going:', user.id, input.eventId);
      return { success: true, attendee: existing };
    }

    if (previousStatus === 'waitlist' && input.status === 'going') {
      return { success: true, message: 'Already on waitlist', attendee: existing };
    }

    if (previousStatus !== 'going' && input.status === 'going') {
      const shouldAddToWaitlist = 
        event.capacity && 
        event.spotsAvailable !== undefined && 
        event.spotsAvailable <= 0;

      if (shouldAddToWaitlist) {
        await db.updateEventAttendee(existing.id, {
          status: 'waitlist',
        });
        console.log('User moved to waitlist:', user.id, input.eventId);
        return { success: true, attendee: existing, waitlisted: true };
      }

      if (event.spotsAvailable !== undefined) {
        await db.updateEvent(input.eventId, {
          spotsAvailable: event.spotsAvailable - 1,
          attendeeIds: [...event.attendeeIds, user.id],
          status: event.spotsAvailable - 1 === 0 ? 'full' : event.status,
        });
      }
    }

    if (previousStatus === 'going' && input.status === 'interested') {
      const newSpotsAvailable = (event.spotsAvailable ?? 0) + 1;
      await db.updateEvent(input.eventId, {
        spotsAvailable: newSpotsAvailable,
        attendeeIds: event.attendeeIds.filter(id => id !== user.id),
        status: event.status === 'full' ? 'upcoming' : event.status,
      });
    }

    await db.updateEventAttendee(existing.id, {
      status: input.status,
    });

    console.log('User RSVP updated:', user.id, input.eventId, input.status);
    return { success: true, attendee: existing, waitlisted: false };
  });
