import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const removeFavoriteProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      eventId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Remove favorite:', input);

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    const favorite = db.getFavoriteByUserAndEvent(session.userId, input.eventId);
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    db.deleteFavorite(favorite.id);

    console.log('Favorite removed');
    return { success: true };
  });
