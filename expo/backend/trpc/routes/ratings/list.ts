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

    const ratings = await db.getRatingsByCreatorId(input.creatorId);

    const ratingsWithUsersPromises = ratings.map(async (rating) => {
      const reviewer = await db.getUserById(rating.reviewerId);
      const event = await db.getEventById(rating.eventId);
      const reviewerProfile = reviewer ? await db.getProfileByUserId(reviewer.id) : null;
      return {
        ...rating,
        reviewer: reviewer ? {
          id: reviewer.id,
          name: reviewer.name,
          profile: reviewerProfile,
        } : undefined,
        event: event ? {
          id: event.id,
          title: event.title,
        } : undefined,
      };
    });

    const ratingsWithUsers = await Promise.all(ratingsWithUsersPromises);
    const sortedRatings = ratingsWithUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log('Ratings found:', sortedRatings.length);
    return { ratings: sortedRatings };
  });
