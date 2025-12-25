import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { getSupabase } from '@/lib/supabase';

export const listFavoritesProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('List favorites');

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const favorites = await db.getFavoritesByUserId(user.id);
    const eventsPromises = favorites.map(fav => db.getEventById(fav.eventId));
    const eventsResults = await Promise.all(eventsPromises);
    const events = eventsResults.filter(e => e !== null);

    console.log('Favorites found:', events.length);
    return { favorites: events };
  });
