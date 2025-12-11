import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const listFavoritesProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('List favorites');

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    const favorites = db.getFavoritesByUserId(session.userId);
    const events = favorites
      .map(fav => db.getEventById(fav.eventId))
      .filter(e => e !== undefined);

    console.log('Favorites found:', events.length);
    return { favorites: events };
  });
