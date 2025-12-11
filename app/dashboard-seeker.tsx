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
  Heart,
  MessageCircle,
  Bell,
  Calendar,
  MapPin,
  Users,
  Search,
  Bookmark,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { EventWithMatch, FavoriteEvent } from '@/types';

type TabType = 'matches' | 'saved';

export default function SeekerDashboardScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('matches');
  const [refreshing, setRefreshing] = useState(false);

  const eventsQuery = trpc.events.list.useQuery(
    { token: token || '', sortBy: 'match' },
    { enabled: !!token }
  );

  const favoritesQuery = trpc.favorites.list.useQuery(
    { token: token || '' },
    { enabled: !!token }
  );

  const conversationsQuery = trpc.messages.conversations.useQuery(
    { token: token || '' },
    { enabled: !!token }
  );

  const addFavoriteMutation = trpc.favorites.add.useMutation();
  const removeFavoriteMutation = trpc.favorites.remove.useMutation();

  const events = (eventsQuery.data || []) as EventWithMatch[];
  const favorites = (favoritesQuery.data || []) as FavoriteEvent[];
  const conversationsData = conversationsQuery.data as { conversations: any[] } | undefined;
  const conversations = conversationsData?.conversations || [];

  const upcomingEvents = events.filter(
    (e) => e.event.status === 'upcoming' || e.event.status === 'ongoing'
  );

  const favoriteEventIds = new Set(favorites.map((f) => f.eventId));
  const savedEvents = events.filter((e) => favoriteEventIds.has(e.event.id));

  const displayedEvents = activeTab === 'matches' ? upcomingEvents : savedEvents;

  const unreadMessages = conversations.filter(
    (c: any) => c.lastMessage && !c.lastMessage.read && c.lastMessage.receiverId === user?.id
  ).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      eventsQuery.refetch(),
      favoritesQuery.refetch(),
      conversationsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/event-details/${eventId}` as any);
  };

  const handleToggleFavorite = async (eventId: string) => {
    try {
      if (favoriteEventIds.has(eventId)) {
        await removeFavoriteMutation.mutateAsync({
          token: token || '',
          eventId,
        });
      } else {
        await addFavoriteMutation.mutateAsync({
          token: token || '',
          eventId,
        });
      }
      favoritesQuery.refetch();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleMessagesPress = () => {
    router.push('/messages');
  };

  const handleBrowsePress = () => {
    router.push('/events');
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return Colors.match.high;
    if (score >= 65) return Colors.match.medium;
    return Colors.match.low;
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
            <Text style={styles.greeting}>Discover</Text>
            <Text style={styles.subGreeting}>
              {upcomingEvents.length} matches for you
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={handleMessagesPress}
            >
              <MessageCircle size={24} color={Colors.text.white} />
              {unreadMessages > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => {}}
            >
              <Bell size={24} color={Colors.text.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matches' && styles.tabActive]}
          onPress={() => setActiveTab('matches')}
        >
          <Search size={18} color={activeTab === 'matches' ? Colors.text.white : Colors.text.secondary} />
          <Text
            style={[
              styles.tabText,
              activeTab === 'matches' && styles.tabTextActive,
            ]}
          >
            Matches ({upcomingEvents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
          onPress={() => setActiveTab('saved')}
        >
          <Bookmark size={18} color={activeTab === 'saved' ? Colors.text.white : Colors.text.secondary} />
          <Text
            style={[
              styles.tabText,
              activeTab === 'saved' && styles.tabTextActive,
            ]}
          >
            Saved ({savedEvents.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.eventsSection}>
          {displayedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              {activeTab === 'matches' ? (
                <>
                  <Heart size={64} color={Colors.text.light} />
                  <Text style={styles.emptyTitle}>No matches yet</Text>
                  <Text style={styles.emptyDescription}>
                    Check back soon for new events that match your preferences
                  </Text>
                </>
              ) : (
                <>
                  <Bookmark size={64} color={Colors.text.light} />
                  <Text style={styles.emptyTitle}>No saved events</Text>
                  <Text style={styles.emptyDescription}>
                    Tap the heart icon on events you like to save them here
                  </Text>
                </>
              )}
              <TouchableOpacity
                style={styles.browseButton}
                onPress={handleBrowsePress}
              >
                <Text style={styles.browseButtonText}>Browse Events</Text>
              </TouchableOpacity>
            </View>
          ) : (
            displayedEvents.map((item) => (
              <TouchableOpacity
                key={item.event.id}
                style={styles.eventCard}
                activeOpacity={0.95}
                onPress={() => handleEventPress(item.event.id)}
              >
                <Image
                  source={{ uri: item.event.imageUrl }}
                  style={styles.eventImage}
                />

                <View
                  style={[
                    styles.matchBadge,
                    { backgroundColor: getMatchColor(item.matchScore.totalScore) },
                  ]}
                >
                  <Heart
                    size={16}
                    color={Colors.text.white}
                    fill={Colors.text.white}
                  />
                  <Text style={styles.matchText}>
                    {item.matchScore.totalScore}%
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => handleToggleFavorite(item.event.id)}
                >
                  <Heart
                    size={24}
                    color={favoriteEventIds.has(item.event.id) ? Colors.coral : Colors.text.white}
                    fill={favoriteEventIds.has(item.event.id) ? Colors.coral : 'transparent'}
                  />
                </TouchableOpacity>

                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{item.event.title}</Text>

                  <View style={styles.eventMeta}>
                    <View style={styles.metaRow}>
                      <Calendar size={14} color={Colors.text.secondary} />
                      <Text style={styles.metaText}>
                        {new Date(item.event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at {item.event.time}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <MapPin size={14} color={Colors.text.secondary} />
                      <Text style={styles.metaText}>{item.event.location}</Text>
                    </View>

                    {item.event.capacity && (
                      <View style={styles.metaRow}>
                        <Users size={14} color={Colors.text.secondary} />
                        <Text style={styles.metaText}>
                          {item.event.spotsAvailable || 0} / {item.event.capacity}{' '}
                          spots
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.sharedInterests}>
                    {item.matchScore.sharedInterests.slice(0, 3).map((interest) => (
                      <View key={interest} style={styles.interestTag}>
                        <Text style={styles.interestTagText}>{interest}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.creatorSection}
                    onPress={() => router.push(`/user-profile/${item.creator.id}` as any)}
                  >
                    <Image
                      source={{ uri: item.creator.photoUrl }}
                      style={styles.creatorPhoto}
                    />
                    <View style={styles.creatorInfo}>
                      <Text style={styles.creatorName}>
                        {item.creator.name}, {item.creator.age}
                      </Text>
                      <Text style={styles.creatorBio} numberOfLines={2}>
                        {item.creator.bio}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleBrowsePress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[Colors.coral, Colors.peach]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Search size={24} color={Colors.text.white} />
        </LinearGradient>
      </TouchableOpacity>
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.background.card,
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
  content: {
    flex: 1,
  },
  eventsSection: {
    padding: 20,
    gap: 20,
  },
  eventCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  eventImage: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.border.light,
  },
  matchBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  matchText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text.white,
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 20,
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
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  sharedInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  interestTag: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  interestTagText: {
    fontSize: 12,
    color: Colors.coral,
    fontWeight: '600' as const,
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  creatorPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.border.light,
  },
  creatorInfo: {
    flex: 1,
    gap: 4,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  creatorBio: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
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
  browseButton: {
    marginTop: 24,
    backgroundColor: Colors.coral,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
