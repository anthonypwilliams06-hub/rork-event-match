import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import { supabase } from '@/lib/supabase';

export const checkChatEligibilityProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      otherUserId: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log('Check chat eligibility');

    const { data: { user }, error } = await supabase.auth.getUser(input.token);
    if (error || !user) {
      throw new Error('Invalid session');
    }

    const blocked = await db.getBlockedUser(user.id, input.otherUserId);
    if (blocked) {
      return { 
        canChat: false, 
        reason: 'blocked',
        message: 'You have blocked this user' 
      };
    }

    const blockedBy = await db.getBlockedUser(input.otherUserId, user.id);
    if (blockedBy) {
      return { 
        canChat: false, 
        reason: 'blocked_by',
        message: 'This user has blocked you' 
      };
    }

    const sharedEvents = await db.getSharedEvents(user.id, input.otherUserId);
    
    const hasSharedGoingRSVP = sharedEvents.some(event => {
      const userAttendance = event.attendees.find(a => a.userId === user.id);
      const otherAttendance = event.attendees.find(a => a.userId === input.otherUserId);
      
      return userAttendance?.status === 'going' && otherAttendance?.status === 'going';
    });

    if (!hasSharedGoingRSVP) {
      return {
        canChat: false,
        reason: 'no_shared_rsvp',
        message: 'You can only chat with users you share a "Going" RSVP with'
      };
    }

    return { 
      canChat: true,
      sharedEventIds: sharedEvents.map(e => e.id)
    };
  });
