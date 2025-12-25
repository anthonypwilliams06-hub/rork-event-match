import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';
import { getSupabase } from '@/lib/supabase';

export const addFavoriteProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      eventId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Add favorite:', input);

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const event = await db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const existing = await db.getFavoriteByUserAndEvent(user.id, input.eventId);
    if (existing) {
      return { favorite: existing, message: 'Already favorited' };
    }

    const favorite = await db.createFavorite({
      id: randomBytes(16).toString('hex'),
      userId: user.id,
      eventId: input.eventId,
      createdAt: new Date(),
    });

    console.log('Favorite added:', favorite);
    return { favorite };
  });
