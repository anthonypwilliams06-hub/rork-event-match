import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const getCreatorStatsProcedure = publicProcedure
  .input(
    z.object({
      creatorId: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('Get creator stats');

    const ratings = await db.getRatingsByCreatorId(input.creatorId);
    const events = await db.getEventsByCreatorId(input.creatorId);

    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    const stats = {
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length,
      totalEvents: events.filter(e => !e.isDraft).length,
    };

    console.log('Creator stats:', stats);
    return { stats };
  });
