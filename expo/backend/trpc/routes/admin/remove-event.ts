import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { getSupabase } from '@/lib/supabase';

export const removeEventProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      eventId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Remove event:', input.eventId);

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const event = await db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    await db.updateEvent(input.eventId, {
      status: 'cancelled',
    });

    console.log('Event removed successfully:', input.eventId);
    return { success: true };
  });
