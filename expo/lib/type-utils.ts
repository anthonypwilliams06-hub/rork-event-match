/**
 * Type utility functions for converting API responses to proper TypeScript types
 * Handles date string to Date conversions and type guards
 */

import { Message, Event, EventWithMatch } from '@/types';

/**
 * Convert API message response (with string dates) to Message type (with Date objects)
 */
export function convertApiMessage(apiMessage: any): Message {
  return {
    ...apiMessage,
    createdAt: new Date(apiMessage.createdAt),
  };
}

/**
 * Convert array of API messages to proper Message types
 */
export function convertApiMessages(apiMessages: any[]): Message[] {
  return apiMessages.map(convertApiMessage);
}

/**
 * Convert API event response (with string dates) to Event type (with Date objects)
 */
export function convertApiEvent(apiEvent: any): Event {
  return {
    ...apiEvent,
    date: new Date(apiEvent.date),
    createdAt: new Date(apiEvent.createdAt),
    updatedAt: new Date(apiEvent.updatedAt),
  };
}

/**
 * Convert array of API events to proper Event types
 */
export function convertApiEvents(apiEvents: any[]): Event[] {
  return apiEvents.map(convertApiEvent);
}

/**
 * Convert API event with match response to EventWithMatch type
 */
export function convertApiEventWithMatch(apiEventWithMatch: any): EventWithMatch {
  return {
    ...apiEventWithMatch,
    event: convertApiEvent(apiEventWithMatch.event),
  };
}

/**
 * Convert array of API events with match to proper EventWithMatch types
 */
export function convertApiEventsWithMatch(apiEventsWithMatch: any[]): EventWithMatch[] {
  return apiEventsWithMatch.map(convertApiEventWithMatch);
}

/**
 * Type guard to check if an item is an Event
 */
export function isEvent(item: any): item is Event {
  return item && typeof item === 'object' && 'id' in item && 'creatorId' in item && 'title' in item && item.date instanceof Date;
}

/**
 * Type guard to check if an item is an EventWithMatch
 */
export function isEventWithMatch(item: any): item is EventWithMatch {
  return item && typeof item === 'object' && 'event' in item && 'creator' in item && 'matchScore' in item && item.event.date instanceof Date;
}
