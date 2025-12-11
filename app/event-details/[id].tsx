import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar,
  MapPin,
  Users,
  Edit2,
  Trash2,
  MoreVertical,
  X,
  Ban,
  CheckCircle,
  Heart,
  MessageCircle,
  UserCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { EventStatus } from '@/types';

export default function EventDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const eventQuery = trpc.events.get.useQuery({ id: id || '' }, {
    enabled: !!id,
  });

  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      eventQuery.refetch();
    },
  });

  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Event deleted successfully');
      router.back();
    },
  });

  const event = eventQuery.data;
  const isOwner = user?.id === event?.creatorId;

  const addFavoriteMutation = trpc.favorites.add.useMutation({
    onSuccess: () => {
      setIsFavorited(true);
      Alert.alert('Success', 'Added to favorites!');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const removeFavoriteMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      setIsFavorited(false);
      Alert.alert('Success', 'Removed from favorites');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!event || !user) return;
            try {
              await deleteEventMutation.mutateAsync({
                id: event.id,
                creatorId: user.id,
              });
            } catch (err) {
              Alert.alert('Error', 'Failed to delete event');
              console.error('Error deleting event:', err);
            }
          },
        },
      ]
    );
  };

  const handleMarkAsFull = async () => {
    if (!event) return;
    try {
      await updateEventMutation.mutateAsync({
        id: event.id,
        status: 'full',
        spotsAvailable: 0,
      });
      Alert.alert('Success', 'Event marked as full');
    } catch (err) {
      Alert.alert('Error', 'Failed to update event');
      console.error('Error updating event:', err);
    }
  };

  const handleMarkAsUpcoming = async () => {
    if (!event) return;
    try {
      await updateEventMutation.mutateAsync({
        id: event.id,
        status: 'upcoming',
        spotsAvailable: event.capacity,
      });
      Alert.alert('Success', 'Event marked as upcoming');
    } catch (err) {
      Alert.alert('Error', 'Failed to update event');
      console.error('Error updating event:', err);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel this event?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            if (!event) return;
            try {
              await updateEventMutation.mutateAsync({
                id: event.id,
                status: 'cancelled',
              });
              Alert.alert('Success', 'Event cancelled');
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel event');
              console.error('Error updating event:', err);
            }
          },
        },
      ]
    );
  };

  const handlePublish = async () => {
    if (!event) return;
    try {
      await updateEventMutation.mutateAsync({
        id: event.id,
        isDraft: false,
        status: 'upcoming',
      });
      Alert.alert('Success', 'Event published!');
    } catch (err) {
      Alert.alert('Error', 'Failed to publish event');
      console.error('Error publishing event:', err);
    }
  };

  const handleToggleFavorite = () => {
    if (!token || !event) return;
    if (isFavorited) {
      removeFavoriteMutation.mutate({ token, eventId: event.id });
    } else {
      addFavoriteMutation.mutate({ token, eventId: event.id });
    }
  };

  const handleViewCreatorProfile = () => {
    if (!event) return;
    router.push(`/user-profile/${event.creatorId}` as any);
  };

  const handleMessageCreator = () => {
    if (!event) return;
    router.push(`/chat/${event.creatorId}` as any);
  };

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'upcoming':
        return Colors.coral;
      case 'ongoing':
        return '#10B981';
      case 'completed':
        return Colors.text.secondary;
      case 'cancelled':
        return '#EF4444';
      case 'full':
        return '#F59E0B';
      case 'draft':
        return Colors.text.light;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusLabel = (status: EventStatus, isDraft: boolean) => {
    if (isDraft) return 'Draft';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (eventQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Event Details',
          headerStyle: {
            backgroundColor: Colors.background.card,
          },
          headerShadowVisible: false,
          headerRight: isOwner
            ? () => (
                <TouchableOpacity
                  onPress={() => setShowMenu(!showMenu)}
                  style={styles.menuButton}
                >
                  <MoreVertical size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      {showMenu && isOwner && (
        <View style={styles.menuOverlay}>
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert('Coming Soon', 'Event editing will be available soon');
              }}
            >
              <Edit2 size={20} color={Colors.text.primary} />
              <Text style={styles.menuItemText}>Edit Event</Text>
            </TouchableOpacity>

            {event.isDraft && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  handlePublish();
                }}
              >
                <CheckCircle size={20} color={Colors.coral} />
                <Text style={[styles.menuItemText, { color: Colors.coral }]}>
                  Publish Event
                </Text>
              </TouchableOpacity>
            )}

            {!event.isDraft && event.status !== 'full' && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  handleMarkAsFull();
                }}
              >
                <Ban size={20} color={Colors.text.secondary} />
                <Text style={styles.menuItemText}>Mark as Full</Text>
              </TouchableOpacity>
            )}

            {event.status === 'full' && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  handleMarkAsUpcoming();
                }}
              >
                <CheckCircle size={20} color={Colors.coral} />
                <Text style={[styles.menuItemText, { color: Colors.coral }]}>
                  Reopen Event
                </Text>
              </TouchableOpacity>
            )}

            {!event.isDraft && event.status !== 'cancelled' && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  handleCancel();
                }}
              >
                <X size={20} color='#EF4444' />
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
                  Cancel Event
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleDelete();
              }}
            >
              <Trash2 size={20} color='#EF4444' />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
                Delete Event
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: getStatusColor(
                event.isDraft ? 'draft' : event.status
              ),
            },
          ]}
        >
          <Text style={styles.statusText}>
            {getStatusLabel(event.status, event.isDraft)}
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.infoRow}>
            <Calendar size={20} color={Colors.text.secondary} />
            <Text style={styles.infoText}>
              {new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              at {event.time}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={20} color={Colors.text.secondary} />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>

          {event.capacity && (
            <View style={styles.infoRow}>
              <Users size={20} color={Colors.text.secondary} />
              <Text style={styles.infoText}>
                {event.spotsAvailable || 0} / {event.capacity} spots available
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{event.description}</Text>

          {!isOwner && (
            <>
              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.creatorSection}
                onPress={handleViewCreatorProfile}
                activeOpacity={0.7}
              >
                <UserCircle size={50} color={Colors.coral} />
                <View style={styles.creatorInfo}>
                  <Text style={styles.creatorLabel}>Hosted by</Text>
                  <Text style={styles.creatorName}>View Profile →</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.favoriteButton]}
                  onPress={handleToggleFavorite}
                  activeOpacity={0.8}
                >
                  <Heart
                    size={24}
                    color={isFavorited ? Colors.coral : Colors.text.secondary}
                    fill={isFavorited ? Colors.coral : 'transparent'}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      isFavorited && styles.actionButtonTextActive,
                    ]}
                  >
                    {isFavorited ? 'Liked' : 'Like'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.messageButton]}
                  onPress={handleMessageCreator}
                  activeOpacity={0.8}
                >
                  <MessageCircle size={24} color={Colors.text.white} />
                  <Text style={[styles.actionButtonText, styles.messageButtonText]}>
                    Message
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {isOwner && event.isDraft && (
            <TouchableOpacity
              style={styles.publishButton}
              onPress={handlePublish}
              disabled={updateEventMutation.isPending}
            >
              <LinearGradient
                colors={[Colors.coral, Colors.peach]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.publishButtonGradient}
              >
                <CheckCircle size={20} color={Colors.text.white} />
                <Text style={styles.publishButtonText}>
                  {updateEventMutation.isPending
                    ? 'Publishing...'
                    : 'Publish Event'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.card,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  menuOverlay: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 1000,
  },
  menu: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  eventImage: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.border.light,
  },
  statusBadge: {
    position: 'absolute',
    top: 260,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text.white,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.coral,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  favoriteButton: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  messageButton: {
    backgroundColor: Colors.coral,
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  actionButtonTextActive: {
    color: Colors.coral,
  },
  messageButtonText: {
    color: Colors.text.white,
  },
  publishButton: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  publishButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  publishButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
});
