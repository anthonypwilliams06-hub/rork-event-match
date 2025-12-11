import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const listRatingsProcedure = publicProcedure
  .input(
    z.object({
      creatorId: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('List ratings for creator');

    const ratings = db.getRatingsByCreatorId(input.creatorId);

    const ratingsWithUsers = ratings.map(rating => {
      const reviewer = db.getUserById(rating.reviewerId);
      const event = db.getEventById(rating.eventId);
      return {
        ...rating,
        reviewer: reviewer ? {
          id: reviewer.id,
          name: reviewer.name,
          profile: reviewer.profile,
        } : undefined,
        event: event ? {
          id: event.id,
          title: event.title,
        } : undefined,
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log('Ratings found:', ratingsWithUsers.length);
    return { ratings: ratingsWithUsers };
  });
