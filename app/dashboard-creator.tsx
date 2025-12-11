import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar,
  Heart,
  MessageCircle,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Users,
  MapPin,
  Bell,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { Event as AppEvent } from '@/types';

type TabType = 'active' | 'drafts' | 'completed';

export default function CreatorDashboardScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [refreshing, setRefreshing] = useState(false);

  const eventsQuery = trpc.events.list.useQuery(
    { token: token || '' },
    { enabled: !!token }
  );

  const deleteEventMutation = trpc.events.delete.useMutation();

  const myEvents = (eventsQuery.data || []) as AppEvent[];

  const activeEvents = myEvents.filter(
    (e) => e.status === 'upcoming' || e.status === 'ongoing'
  );
  const draftEvents = myEvents.filter((e) => e.isDraft);
  const completedEvents = myEvents.filter((e) => e.status === 'completed');

  const displayedEvents =
    activeTab === 'active'
      ? activeEvents
      : activeTab === 'drafts'
      ? draftEvents
      : completedEvents;

  const totalViews = myEvents.reduce((sum, event) => {
    return sum + Math.floor(Math.random() * 200);
  }, 0);

  const totalLikes = myEvents.reduce((sum, event) => {
    return sum + Math.floor(Math.random() * 50);
  }, 0);

  const totalMessages = Math.floor(Math.random() * 30);

  const onRefresh = async () => {
    setRefreshing(true);
    await eventsQuery.refetch();
    setRefreshing(false);
  };

  const handleEditEvent = (eventId: string) => {
    router.push(`/event-details/${eventId}` as any);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      if (!user?.id) return;
      await deleteEventMutation.mutateAsync({
        id: eventId,
        creatorId: user.id,
      });
      eventsQuery.refetch();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleCreateEvent = () => {
    router.push('/create-event');
  };

  const handleMessagesPress = () => {
    router.push('/messages');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.coral, Colors.peach]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>My Dashboard</Text>
            <Text style={styles.subGreeting}>
              {user?.name || 'Event Creator'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={handleMessagesPress}
          >
            <Bell size={24} color={Colors.text.white} />
            {totalMessages > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {totalMessages}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Eye size={24} color={Colors.coral} />
            </View>
            <Text style={styles.statValue}>{totalViews}</Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Heart size={24} color={Colors.coral} />
            </View>
            <Text style={styles.statValue}>{totalLikes}</Text>
            <Text style={styles.statLabel}>Total Likes</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MessageCircle size={24} color={Colors.coral} />
            </View>
            <Text style={styles.statValue}>{totalMessages}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.quickCreateButton}
          onPress={handleCreateEvent}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[Colors.coral, Colors.peach]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickCreateGradient}
          >
            <Plus size={24} color={Colors.text.white} />
            <Text style={styles.quickCreateText}>Create New Event</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'active' && styles.tabTextActive,
              ]}
            >
              Active ({activeEvents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'drafts' && styles.tabActive]}
            onPress={() => setActiveTab('drafts')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'drafts' && styles.tabTextActive,
              ]}
            >
              Drafts ({draftEvents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'completed' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('completed')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'completed' && styles.tabTextActive,
              ]}
            >
              Completed ({completedEvents.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventsSection}>
          {displayedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={64} color={Colors.text.light} />
              <Text style={styles.emptyTitle}>No {activeTab} events</Text>
              <Text style={styles.emptyDescription}>
                {activeTab === 'active'
                  ? 'Create your first event to start connecting!'
                  : activeTab === 'drafts'
                  ? "You don't have any draft events"
                  : "You don't have any completed events yet"}
              </Text>
            </View>
          ) : (
            displayedEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <Image
                  source={{ uri: event.imageUrl }}
                  style={styles.eventImage}
                />

                {event.status === 'full' && (
                  <View style={styles.fullBadge}>
                    <Text style={styles.fullBadgeText}>FULL</Text>
                  </View>
                )}

                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>

                  <View style={styles.eventMeta}>
                    <View style={styles.metaRow}>
                      <Calendar size={16} color={Colors.text.secondary} />
                      <Text style={styles.metaText}>
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at {event.time}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <MapPin size={16} color={Colors.text.secondary} />
                      <Text style={styles.metaText}>{event.location}</Text>
                    </View>

                    {event.capacity && (
                      <View style={styles.metaRow}>
                        <Users size={16} color={Colors.text.secondary} />
                        <Text style={styles.metaText}>
                          {event.spotsAvailable || 0} / {event.capacity} spots
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.eventStats}>
                    <View style={styles.statItem}>
                      <Eye size={16} color={Colors.coral} />
                      <Text style={styles.statItemText}>
                        {Math.floor(Math.random() * 200)}
                      </Text>
                    </View>

                    <View style={styles.statItem}>
                      <Heart size={16} color={Colors.coral} />
                      <Text style={styles.statItemText}>
                        {Math.floor(Math.random() * 50)}
                      </Text>
                    </View>

                    <View style={styles.statItem}>
                      <MessageCircle size={16} color={Colors.coral} />
                      <Text style={styles.statItemText}>
                        {Math.floor(Math.random() * 10)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.eventActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditEvent(event.id)}
                    >
                      <Edit3 size={18} color={Colors.coral} />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 size={18} color="#EF4444" />
                      <Text style={[styles.actionButtonText, styles.deleteText]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.white,
  },
  subGreeting: {
    fontSize: 15,
    color: Colors.text.white,
    opacity: 0.9,
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.text.white,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  quickCreateButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  quickCreateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  quickCreateText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.white,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.background.card,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.coral,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.text.white,
  },
  eventsSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  eventCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  eventImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.border.light,
  },
  fullBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fullBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text.white,
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  eventMeta: {
    gap: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  eventStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItemText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.coral,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteText: {
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 20,
  },
  emptyDescription: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});
