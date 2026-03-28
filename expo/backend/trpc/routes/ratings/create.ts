import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { randomBytes } from 'crypto';
import { getSupabase } from '@/lib/supabase';

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

    const { data: { user }, error } = await getSupabase().auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const event = await db.getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.creatorId === user.id) {
      throw new Error('Cannot rate your own event');
    }

    const existingRating = await db.getRatingByEventAndReviewer(input.eventId, user.id);
    if (existingRating) {
      const updated = await db.updateRating(existingRating.id, {
        rating: input.rating,
        review: input.review,
      });
      return { rating: updated, message: 'Rating updated' };
    }

    const rating = await db.createRating({
      id: randomBytes(16).toString('hex'),
      eventId: input.eventId,
      reviewerId: user.id,
      creatorId: event.creatorId,
      rating: input.rating,
      review: input.review,
      createdAt: new Date(),
    });

    console.log('Rating created:', rating.id);
    return { rating };
  });
