import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";

const setReminderSchema = z.object({
  token: z.string(),
  eventId: z.string(),
  reminderType: z.enum(['24h', '2h', '1h']),
});

export const setReminderProcedure = publicProcedure
  .input(setReminderSchema)
  .mutation(async ({ input }) => {
    const user = await db.getUserById(input.token);
    if (!user) {
      throw new Error('User not found');
    }

    const event = await db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const eventDateTime = new Date(event.date);
    let scheduledTime: Date;

    switch (input.reminderType) {
      case '24h':
        scheduledTime = new Date(eventDateTime.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '2h':
        scheduledTime = new Date(eventDateTime.getTime() - 2 * 60 * 60 * 1000);
        break;
      case '1h':
        scheduledTime = new Date(eventDateTime.getTime() - 60 * 60 * 1000);
        break;
      default:
        throw new Error('Invalid reminder type');
    }

    const reminderId = `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const reminder = await db.createEventReminder({
      id: reminderId,
      eventId: input.eventId,
      userId: user.id,
      reminderType: input.reminderType,
      scheduledTime,
      sent: false,
      createdAt: new Date(),
    });

    console.log('Event reminder created:', user.id, input.eventId, input.reminderType);
    return { success: true, reminder };
  });
