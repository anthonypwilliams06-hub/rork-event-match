import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { trackRSVPSubmitted } from '@/lib/analytics';
import { CheckCircle, Heart, X, Users, Bell, Calendar as CalendarIcon } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { RSVPStatus } from '@/types';

interface RSVPActionsProps {
  eventId: string;
  currentStatus: RSVPStatus | null;
  capacity?: number;
  spotsAvailable?: number;
  waitlisted?: boolean;
  onStatusChange: (status: 'going' | 'interested' | 'not_going') => void;
  onSetReminder: () => void;
  onAddToCalendar: () => void;
  disabled?: boolean;
}

export default function RSVPActions({
  eventId,
  currentStatus,
  capacity,
  spotsAvailable,
  waitlisted,
  onStatusChange,
  onSetReminder,
  onAddToCalendar,
  disabled = false,
}: RSVPActionsProps) {
  const isFull = capacity && spotsAvailable !== undefined && spotsAvailable <= 0;
  const showWaitlistBadge = waitlisted || (currentStatus === 'waitlist');

  const handleStatusPress = (status: 'going' | 'interested' | 'not_going') => {
    if (disabled) return;
    
    if (status === 'going' && isFull && currentStatus !== 'going') {
      Alert.alert(
        'Event Full',
        'This event is at capacity. Would you like to join the waitlist?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Join Waitlist', onPress: () => {
            trackRSVPSubmitted(eventId, 'waitlist');
            onStatusChange('going');
          } },
        ]
      );
    } else {
      trackRSVPSubmitted(eventId, status);
      onStatusChange(status);
    }
  };

  return (
    <View style={styles.container}>
      {capacity !== undefined && (
        <View style={styles.capacityContainer}>
          <Users size={16} color={Colors.text.secondary} />
          <Text style={styles.capacityText}>
            {spotsAvailable !== undefined 
              ? `${spotsAvailable} of ${capacity} spots left`
              : `${capacity} spots total`}
          </Text>
          {isFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>FULL</Text>
            </View>
          )}
        </View>
      )}

      {showWaitlistBadge && (
        <View style={styles.waitlistBanner}>
          <Text style={styles.waitlistText}>
            You&apos;re on the waitlist. We&apos;ll notify you if a spot opens up!
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Your RSVP</Text>
      
      <View style={styles.rsvpButtons}>
        <TouchableOpacity
          style={[
            styles.rsvpButton,
            currentStatus === 'going' && styles.rsvpButtonActive,
          ]}
          onPress={() => handleStatusPress('going')}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <View style={styles.rsvpButtonInner}>
            <CheckCircle 
              size={20} 
              color={currentStatus === 'going' ? Colors.text.white : Colors.coral} 
            />
            <Text
              style={[
                styles.rsvpButtonText,
                currentStatus === 'going' && styles.rsvpButtonTextActive,
              ]}
            >
              Going
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.rsvpButton,
            currentStatus === 'interested' && styles.rsvpButtonActive,
          ]}
          onPress={() => handleStatusPress('interested')}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <View style={styles.rsvpButtonInner}>
            <Heart 
              size={20} 
              color={currentStatus === 'interested' ? Colors.text.white : Colors.peach} 
            />
            <Text
              style={[
                styles.rsvpButtonText,
                currentStatus === 'interested' && styles.rsvpButtonTextActive,
              ]}
            >
              Interested
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.rsvpButton,
            currentStatus === 'not_going' && styles.rsvpButtonActive,
          ]}
          onPress={() => handleStatusPress('not_going')}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <View style={styles.rsvpButtonInner}>
            <X 
              size={20} 
              color={currentStatus === 'not_going' ? Colors.text.white : Colors.text.secondary} 
            />
            <Text
              style={[
                styles.rsvpButtonText,
                currentStatus === 'not_going' && styles.rsvpButtonTextActive,
              ]}
            >
              Not Going
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {(currentStatus === 'going' || currentStatus === 'interested') && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onSetReminder}
            activeOpacity={0.7}
          >
            <Bell size={18} color={Colors.coral} />
            <Text style={styles.actionButtonText}>Set Reminder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAddToCalendar}
            activeOpacity={0.7}
          >
            <CalendarIcon size={18} color={Colors.coral} />
            <Text style={styles.actionButtonText}>Add to Calendar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  fullBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  fullBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.white,
  },
  waitlistBanner: {
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  waitlistText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
    textAlign: 'center' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rsvpButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderRadius: 12,
    padding: 12,
    backgroundColor: Colors.text.white,
  },
  rsvpButtonActive: {
    borderColor: Colors.coral,
    backgroundColor: Colors.coral,
  },
  rsvpButtonInner: {
    alignItems: 'center',
    gap: 6,
  },
  rsvpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  rsvpButtonTextActive: {
    color: Colors.text.white,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.coral,
    borderRadius: 12,
    backgroundColor: Colors.text.white,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.coral,
  },
});
