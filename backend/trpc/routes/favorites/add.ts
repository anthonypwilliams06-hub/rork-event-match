import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';

export const addFavoriteProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      eventId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Add favorite:', input);

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    const event = db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const existing = db.getFavoriteByUserAndEvent(session.userId, input.eventId);
    if (existing) {
      return { favorite: existing, message: 'Already favorited' };
    }

    const favorite = db.createFavorite({
      id: randomBytes(16).toString('hex'),
      userId: session.userId,
      eventId: input.eventId,
      createdAt: new Date(),
    });

    console.log('Favorite added:', favorite);
    return { favorite };
  });
