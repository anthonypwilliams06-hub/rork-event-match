import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const createUpdateSchema = z.object({
  token: z.string(),
  eventId: z.string(),
  updateType: z.enum(['time_change', 'location_change', 'cancellation', 'info_update']),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  message: z.string().optional(),
});

export const createEventUpdateProcedure = publicProcedure
  .input(createUpdateSchema)
  .mutation(async ({ input }) => {
    const user = await db.getUserById(input.token);
    if (!user) {
      throw new Error('User not found');
    }

    const event = await db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.creatorId !== user.id) {
      throw new Error('Only event creator can create updates');
    }

    const updateId = `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const eventUpdate = await db.createEventUpdate({
      id: updateId,
      eventId: input.eventId,
      updateType: input.updateType,
      oldValue: input.oldValue,
      newValue: input.newValue,
      message: input.message,
      createdAt: new Date(),
    });

    const attendees = await db.getEventAttendees(input.eventId);
    const goingAttendees = attendees.filter(a => a.status === 'going' || a.status === 'interested');

    let notificationTitle = '';
    let notificationBody = '';

    switch (input.updateType) {
      case 'time_change':
        notificationTitle = 'Event Time Changed';
        notificationBody = `${event.title} has been rescheduled to ${input.newValue}`;
        break;
      case 'location_change':
        notificationTitle = 'Event Location Changed';
        notificationBody = `${event.title} location has been updated`;
        break;
      case 'cancellation':
        notificationTitle = 'Event Cancelled';
        notificationBody = `${event.title} has been cancelled`;
        break;
      case 'info_update':
        notificationTitle = 'Event Updated';
        notificationBody = input.message || `${event.title} has been updated`;
        break;
    }

    for (const attendee of goingAttendees) {
      const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.createNotification({
        id: notificationId,
        userId: attendee.userId,
        type: 'event_reminder',
        title: notificationTitle,
        body: notificationBody,
        data: {
          eventId: input.eventId,
        },
        read: false,
        createdAt: new Date(),
      });
    }

    console.log('Event update created and notifications sent:', input.eventId, input.updateType);
    return { success: true, eventUpdate, notificationsSent: goingAttendees.length };
  });
