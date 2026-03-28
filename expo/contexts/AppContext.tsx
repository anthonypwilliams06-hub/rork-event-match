import createContextHook from '@nkzw/create-context-hook';
import { useState, useMemo } from 'react';
import { MOCK_CREATORS, MOCK_EVENTS, MOCK_SEEKER } from '@/mocks/data';
import {
  UserRole,
  CreatorProfile,
  SeekerPreferences,
  Event,
  MatchScore,
  EventWithMatch,
} from '@/types';

function calculateMatchScore(
  seeker: SeekerPreferences,
  creator: CreatorProfile
): MatchScore {
  const interestMatches = creator.interests.filter((interest) =>
    seeker.interests.includes(interest)
  );
  const interestMatch = (interestMatches.length / seeker.interests.length) * 100;

  const traitMatches = creator.personalityTraits.filter((trait) =>
    seeker.preferredTraits.includes(trait)
  );
  const personalityMatch =
    seeker.preferredTraits.length > 0
      ? (traitMatches.length / seeker.preferredTraits.length) * 100
      : 100;

  const relationshipGoalMatch =
    seeker.relationshipGoal === creator.relationshipGoal ? 100 : 50;

  const ageInRange =
    creator.age >= seeker.ageRange.min && creator.age <= seeker.ageRange.max;
  const ageMatch = ageInRange ? 100 : 0;

  const totalScore = Math.round(
    (interestMatch * 0.4 +
      personalityMatch * 0.3 +
      relationshipGoalMatch * 0.2 +
      ageMatch * 0.1)
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

export const [AppProvider, useApp] = createContextHook(() => {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentCreator, setCurrentCreator] = useState<CreatorProfile | null>(null);
  const [currentSeeker, setCurrentSeeker] = useState<SeekerPreferences | null>(MOCK_SEEKER);
  const [creators] = useState<CreatorProfile[]>(MOCK_CREATORS);
  const [events] = useState<Event[]>(MOCK_EVENTS);

  const eventsWithMatches = useMemo<EventWithMatch[]>(() => {
    if (!currentSeeker) return [];

    return events
      .map((event) => {
        const creator = creators.find((c) => c.id === event.creatorId);
        if (!creator) return null;

        const matchScore = calculateMatchScore(currentSeeker, creator);

        return {
          event,
          creator,
          matchScore,
        };
      })
      .filter((item): item is EventWithMatch => item !== null)
      .filter((item) => item.matchScore.totalScore >= 60)
      .sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);
  }, [currentSeeker, events, creators]);

  const selectRole = (role: UserRole) => {
    setUserRole(role);
  };

  const updateCreatorProfile = (profile: CreatorProfile) => {
    setCurrentCreator(profile);
  };

  const updateSeekerPreferences = (preferences: SeekerPreferences) => {
    setCurrentSeeker(preferences);
  };

  const createEvent = (event: Event) => {
    console.log('Event created:', event);
  };

  return {
    userRole,
    currentCreator,
    currentSeeker,
    creators,
    events,
    eventsWithMatches,
    selectRole,
    updateCreatorProfile,
    updateSeekerPreferences,
    createEvent,
    calculateMatchScore,
  };
});
