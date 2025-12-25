import { publicProcedure } from "../../create-context";
import { z } from "zod";
import { db } from "@/backend/db";
import { EventWithMatch, MatchScore, UserProfile, Event as AppEvent } from "@/types";
import { getSupabase } from '@/lib/supabase';

const listEventsSchema = z.object({
  creatorId: z.string().optional(),
  includeDrafts: z.boolean().default(false),
  token: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['match', 'date', 'newest', 'distance']).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
}).optional();

function calculateMatchScore(
  seekerProfile: UserProfile,
  creatorProfile: UserProfile,
  creatorAge: number
): MatchScore {
  const interestMatches = creatorProfile.interests.filter((interest) =>
    seekerProfile.interests.includes(interest)
  );
  const interestMatch = seekerProfile.interests.length > 0
    ? (interestMatches.length / seekerProfile.interests.length) * 100
    : 0;

  const traitMatches = creatorProfile.personalityTraits.filter((trait) =>
    seekerProfile.personalityTraits.includes(trait)
  );
  const personalityMatch = seekerProfile.personalityTraits.length > 0
    ? (traitMatches.length / seekerProfile.personalityTraits.length) * 100
    : 100;

  const relationshipGoalMatch =
    seekerProfile.relationshipGoal && creatorProfile.relationshipGoal
      ? seekerProfile.relationshipGoal === creatorProfile.relationshipGoal
        ? 100
        : 50
      : 75;

  const minAge = seekerProfile.ageRangeMin || 18;
  const maxAge = seekerProfile.ageRangeMax || 99;
  const ageInRange = creatorAge >= minAge && creatorAge <= maxAge;
  const ageMatch = ageInRange ? 100 : 0;

  const totalScore = Math.round(
    interestMatch * 0.4 +
    personalityMatch * 0.3 +
    relationshipGoalMatch * 0.2 +
    ageMatch * 0.1
  );

  return {
    totalScore,
    breakdown: {
      interestMatch: Math.round(interestMatch),
      personalityMatch: Math.round(personalityMatch),
      relationshipGoalMatch: Math.round(relationshipGoalMatch),
      ageMatch: Math.round(ageMatch),
    },
    sharedInterests: interestMatches,
    sharedTraits: traitMatches,
  };
}

export const listEventsProcedure = publicProcedure
  .input(listEventsSchema)
  .query(async ({ input }): Promise<AppEvent[] | EventWithMatch[]> => {
    let events = input?.creatorId 
      ? await db.getEventsByCreatorId(input.creatorId)
      : await db.getAllEvents();

    if (input?.token) {
      const { data: { user: authUser } } = await getSupabase().auth.getUser(input.token);
      if (authUser) {
        const blockedUsers = await db.getBlockedUserIds(authUser.id);
        events = events.filter(e => !blockedUsers.includes(e.creatorId));
      }
    }
    
    if (!input?.includeDrafts) {
      events = events.filter(e => !e.isDraft);
    }

    if (input?.category) {
      events = events.filter(e => e.category === input.category);
    }

    if (input?.search) {
      const searchLower = input.search.toLowerCase();
      events = events.filter(e => 
        e.title.toLowerCase().includes(searchLower) ||
        e.description.toLowerCase().includes(searchLower) ||
        e.location.toLowerCase().includes(searchLower)
      );
    }

    if (input?.startDate) {
      const startDate = new Date(input.startDate);
      events = events.filter(e => e.date >= startDate);
    }

    if (input?.endDate) {
      const endDate = new Date(input.endDate);
      events = events.filter(e => e.date <= endDate);
    }

    if (!input?.token) {
      if (input?.sortBy === 'date') {
        events.sort((a, b) => a.date.getTime() - b.date.getTime());
      } else {
        events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      
      const limit = input?.limit || events.length;
      const offset = input?.offset || 0;
      console.log('Events retrieved (no matching):', events.length);
      return events.slice(offset, offset + limit);
    }

    const { data: { user: authUser } } = await getSupabase().auth.getUser(input.token);
    if (!authUser) {
      events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      console.log('Events retrieved (invalid session):', events.length);
      return events;
    }

    const user = await db.getUserById(authUser.id);
    const seekerProfile = await db.getProfileByUserId(authUser.id);

    if (!user || !seekerProfile || seekerProfile.role !== 'seeker') {
      if (input?.sortBy === 'date') {
        events.sort((a, b) => a.date.getTime() - b.date.getTime());
      } else {
        events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      
      const limit = input?.limit || events.length;
      const offset = input?.offset || 0;
      console.log('Events retrieved (not a seeker):', events.length);
      return events.slice(offset, offset + limit);
    }

    const eventsWithMatchesPromises = events.map(async (event) => {
      const creator = await db.getUserById(event.creatorId);
      const creatorProfile = await db.getProfileByUserId(event.creatorId);

      if (!creator || !creatorProfile || creatorProfile.role !== 'creator') {
        return null;
      }

      const matchScore = calculateMatchScore(seekerProfile, creatorProfile, creator.age);

      return {
        event,
        creator: {
          id: creator.id,
          role: 'creator' as const,
          name: creator.name,
          age: creator.age,
          bio: creatorProfile.bio || '',
          photoUrl: creatorProfile.photoUrl || '',
          interests: creatorProfile.interests,
          personalityTraits: creatorProfile.personalityTraits,
          relationshipGoal: creatorProfile.relationshipGoal || 'open',
          location: creatorProfile.location,
        },
        matchScore,
      };
    });

    const eventsWithMatchesResults = await Promise.all(eventsWithMatchesPromises);
    const eventsWithMatches = eventsWithMatchesResults
      .filter((item): item is EventWithMatch => item !== null)
      .filter((item) => item.matchScore.totalScore >= 60);

    if (input?.sortBy === 'date') {
      eventsWithMatches.sort((a, b) => a.event.date.getTime() - b.event.date.getTime());
    } else if (input?.sortBy === 'newest') {
      eventsWithMatches.sort((a, b) => b.event.createdAt.getTime() - a.event.createdAt.getTime());
    } else {
      eventsWithMatches.sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);
    }

    const limit = input?.limit || eventsWithMatches.length;
    const offset = input?.offset || 0;
    console.log('Events with matches retrieved:', eventsWithMatches.length);
    return eventsWithMatches.slice(offset, offset + limit);
  });
