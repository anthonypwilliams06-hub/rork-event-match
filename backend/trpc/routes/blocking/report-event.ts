import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';
import { getSupabase } from '@/lib/supabase';

export const reportEventProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      eventId: z.string(),
      reason: z.string(),
      description: z.string().max(500).optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Report event');

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const event = await db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (user.id === event.creatorId) {
      throw new Error('Cannot report your own event');
    }

    const report = await db.createReport({
      id: randomBytes(16).toString('hex'),
      reporterId: user.id,
      reportedId: event.creatorId,
      reason: `Event: ${input.reason}`,
      description: `Event ID: ${input.eventId}${input.description ? `\n${input.description}` : ''}`,
      createdAt: new Date(),
      status: 'pending',
    });

    console.log('Event report created:', report.id);
    return { success: true };
  });
