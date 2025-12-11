import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';

export const createRatingProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      eventId: z.string(),
      rating: z.number().min(1).max(5),
      review: z.string().max(500).optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('Create rating');

    const session = db.getSession(input.token);
    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid session');
    }

    const event = db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.creatorId === session.userId) {
      throw new Error('Cannot rate your own event');
    }

    const existingRating = db.getRatingByEventAndReviewer(input.eventId, session.userId);
    if (existingRating) {
      const updated = db.updateRating(existingRating.id, {
        rating: input.rating,
        review: input.review,
      });
      return { rating: updated, message: 'Rating updated' };
    }

    const rating = db.createRating({
      id: randomBytes(16).toString('hex'),
      eventId: input.eventId,
      reviewerId: session.userId,
      creatorId: event.creatorId,
      rating: input.rating,
      review: input.review,
      createdAt: new Date(),
    });

    console.log('Rating created:', rating.id);
    return { rating };
  });
