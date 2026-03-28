import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MapPin, Calendar, Users, X, TrendingUp, Search, SlidersHorizontal } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { EventWithMatch, Event as AppEvent, EventCategory } from '@/types';
import { EVENT_CATEGORIES } from '@/constants/interests';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

type SortOption = 'match' | 'date' | 'newest';

export default function EventsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [selectedMatchBreakdown, setSelectedMatchBreakdown] = useState<EventWithMatch | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const eventsQuery = trpc.events.list.useQuery(
    {
      token: token || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      search: searchQuery || undefined,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
      sortBy: sortBy,
      limit: ITEMS_PER_PAGE,
      offset: page * ITEMS_PER_PAGE,
    },
    { enabled: !!token }
  );

  const events = eventsQuery.data || [];
  const eventsWithMatches = events.filter(
    (event): event is EventWithMatch => 'matchScore' in event
  );
  const regularEvents = events.filter(
    (event): event is AppEvent => !('matchScore' in event)
  );

  const userRole = user?.profile?.role;
  const hasActiveFilters = selectedCategory !== 'all' || searchQuery !== '' || dateRange.start !== null || dateRange.end !== null;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (searchQuery !== '') count++;
    if (dateRange.start || dateRange.end) count++;
    return count;
  }, [selectedCategory, searchQuery, dateRange]);

  const getMatchColor = (score: number) => {
    if (score >= 80) return Colors.match.high;
    if (score >= 65) return Colors.match.medium;
    return Colors.match.low;
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/event-details/${eventId}`);
  };

  const handleMatchBadgePress = (eventWithMatch: EventWithMatch) => {
    setSelectedMatchBreakdown(eventWithMatch);
  };

  const handleProfilePress = (creatorId: string) => {
    router.push(`/user-profile/${creatorId}` as any);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setDateRange({ start: null, end: null });
    setPage(0);
  };

  const handleLoadMore = () => {
    if (events.length === ITEMS_PER_PAGE) {
      setPage(p => p + 1);
    }
  };

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'match', label: 'Best Match' },
    { value: 'date', label: 'Soonest' },
    { value: 'newest', label: 'Newest' },
  ];

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
            <Text style={styles.greeting}>Discover Events</Text>
            <Text style={styles.subGreeting}>
              {eventsWithMatches.length} matches found for you
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={24} color={Colors.text.white} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, locations..."
            placeholderTextColor={Colors.text.light}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {showFilters && (
          <View style={styles.filtersPanel}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === 'all' && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory('all')}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === 'all' && styles.categoryChipTextActive,
                ]}>All</Text>
              </TouchableOpacity>
              {EVENT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === cat.id && styles.categoryChipTextActive,
                  ]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <View style={styles.sortButtons}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortButton,
                      sortBy === option.value && styles.sortButtonActive,
                    ]}
                    onPress={() => setSortBy(option.value)}
                  >
                    <Text style={[
                      styles.sortButtonText,
                      sortBy === option.value && styles.sortButtonTextActive,
                    ]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear all filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </LinearGradient>

      <FlatList
        data={eventsWithMatches}
        keyExtractor={(item) => item.event.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          eventsQuery.isFetching ? (
            <View style={styles.loadingFooter}>
              <Text style={styles.loadingText}>Loading more...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          eventsWithMatches.length === 0 && regularEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Heart size={64} color={Colors.text.light} />
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyDescription}>
                {userRole === 'seeker'
                  ? 'Try adjusting your preferences or check back later for new events'
                  : 'Check back later for new events'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.eventCard}
            activeOpacity={0.95}
            onPress={() => handleEventPress(item.event.id)}
          >
            <Image
              source={{ uri: item.event.imageUrl }}
              style={styles.eventImage}
            />
            
            <TouchableOpacity
              style={[
                styles.matchBadge,
                { backgroundColor: getMatchColor(item.matchScore.totalScore) },
              ]}
              onPress={() => handleMatchBadgePress(item)}
              activeOpacity={0.9}
            >
              <Heart size={16} color={Colors.text.white} fill={Colors.text.white} />
              <Text style={styles.matchText}>{item.matchScore.totalScore}%</Text>
            </TouchableOpacity>

            <View style={styles.eventContent}>
              <View style={styles.eventHeader}>
                <View style={styles.titleRow}>
                  <Text style={styles.eventTitle}>{item.event.title}</Text>
                  {(item.event.status === 'full' || item.event.status === 'cancelled') && (
                    <View style={[
                      styles.statusChip,
                      { backgroundColor: item.event.status === 'full' ? '#FEF3C7' : '#FEE2E2' }
                    ]}>
                      <Text style={[
                        styles.statusChipText,
                        { color: item.event.status === 'full' ? '#F59E0B' : '#EF4444' }
                      ]}>
                        {item.event.status === 'full' ? 'Full' : 'Cancelled'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.eventMeta}>
                  <Calendar size={14} color={Colors.text.secondary} />
                  <Text style={styles.eventMetaText}>
                    {new Date(item.event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {item.event.time}
                  </Text>
                </View>
                <View style={styles.eventMeta}>
                  <MapPin size={14} color={Colors.text.secondary} />
                  <Text style={styles.eventMetaText}>{item.event.location}</Text>
                </View>
                {item.event.capacity && (
                  <View style={styles.eventMeta}>
                    <Users size={14} color={Colors.text.secondary} />
                    <Text style={styles.eventMetaText}>
                      {item.event.spotsAvailable || 0} / {item.event.capacity} spots
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.creatorSection}
                onPress={() => handleProfilePress(item.creator.id)}
              >
                <Image
                  source={{ uri: item.creator.photoUrl }}
                  style={styles.creatorPhoto}
                />
                <View style={styles.creatorInfo}>
                  <Text style={styles.creatorName}>
                    {item.creator.name}, {item.creator.age}
                  </Text>
                  <View style={styles.interestsRow}>
                    {item.matchScore.sharedInterests.slice(0, 3).map((interest) => (
                      <View key={interest} style={styles.interestTag}>
                        <Text style={styles.interestTagText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={!!selectedMatchBreakdown}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMatchBreakdown(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedMatchBreakdown(null)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <TrendingUp size={24} color={Colors.coral} />
                <Text style={styles.modalTitle}>Match Breakdown</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedMatchBreakdown(null)}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {selectedMatchBreakdown && (
              <View style={styles.modalBody}>
                <View style={styles.totalScoreContainer}>
                  <Text style={styles.totalScoreLabel}>Total Compatibility</Text>
                  <View
                    style={[
                      styles.totalScoreBadge,
                      {
                        backgroundColor: getMatchColor(
                          selectedMatchBreakdown.matchScore.totalScore
                        ),
                      },
                    ]}
                  >
                    <Heart
                      size={20}
                      color={Colors.text.white}
                      fill={Colors.text.white}
                    />
                    <Text style={styles.totalScoreText}>
                      {selectedMatchBreakdown.matchScore.totalScore}%
                    </Text>
                  </View>
                </View>

                <View style={styles.dividerModal} />

                <Text style={styles.breakdownTitle}>How we calculated this:</Text>

                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>Interest Alignment</Text>
                    <Text style={styles.breakdownScore}>
                      {selectedMatchBreakdown.matchScore.breakdown.interestMatch}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${selectedMatchBreakdown.matchScore.breakdown.interestMatch}%`,
                      },
                    ]}
                  />
                  {selectedMatchBreakdown.matchScore.sharedInterests.length > 0 && (
                    <View style={styles.sharedItems}>
                      {selectedMatchBreakdown.matchScore.sharedInterests.map((interest) => (
                        <View key={interest} style={styles.sharedTag}>
                          <Text style={styles.sharedTagText}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>Personality Match</Text>
                    <Text style={styles.breakdownScore}>
                      {selectedMatchBreakdown.matchScore.breakdown.personalityMatch}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${selectedMatchBreakdown.matchScore.breakdown.personalityMatch}%`,
                      },
                    ]}
                  />
                  {selectedMatchBreakdown.matchScore.sharedTraits.length > 0 && (
                    <View style={styles.sharedItems}>
                      {selectedMatchBreakdown.matchScore.sharedTraits.map((trait) => (
                        <View key={trait} style={styles.sharedTag}>
                          <Text style={styles.sharedTagText}>{trait}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>Relationship Goal</Text>
                    <Text style={styles.breakdownScore}>
                      {selectedMatchBreakdown.matchScore.breakdown.relationshipGoalMatch}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${selectedMatchBreakdown.matchScore.breakdown.relationshipGoalMatch}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>Age Compatibility</Text>
                    <Text style={styles.breakdownScore}>
                      {selectedMatchBreakdown.matchScore.breakdown.ageMatch}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${selectedMatchBreakdown.matchScore.breakdown.ageMatch}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.whyMatchSection}>
                  <Text style={styles.whyMatchTitle}>Why this match?</Text>
                  <Text style={styles.whyMatchText}>
                    {selectedMatchBreakdown.matchScore.sharedInterests.length > 0
                      ? `You both share ${selectedMatchBreakdown.matchScore.sharedInterests.length} common interest${selectedMatchBreakdown.matchScore.sharedInterests.length > 1 ? 's' : ''}.`
                      : 'This match has potential based on other factors.'}
                    {selectedMatchBreakdown.matchScore.sharedTraits.length > 0 &&
                      ` You have ${selectedMatchBreakdown.matchScore.sharedTraits.length} matching personality trait${selectedMatchBreakdown.matchScore.sharedTraits.length > 1 ? 's' : ''}.`}
                    {selectedMatchBreakdown.matchScore.breakdown.relationshipGoalMatch === 100 &&
                      ' You both want the same type of relationship.'}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {userRole === 'creator' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push('/create-event')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[Colors.coral, Colors.peach]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Text style={styles.fabText}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.text.white,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.coral,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    gap: 12,
  },
  searchIcon: {
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  filtersPanel: {
    marginTop: 16,
    gap: 12,
  },
  categoriesRow: {
    gap: 8,
    paddingRight: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryChipActive: {
    backgroundColor: Colors.text.white,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  categoryChipTextActive: {
    color: Colors.coral,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sortButtonActive: {
    backgroundColor: Colors.text.white,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.white,
  },
  sortButtonTextActive: {
    color: Colors.coral,
  },
  clearButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: Colors.text.white,
    textDecorationLine: 'underline',
    fontWeight: '600' as const,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.secondary,
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
    height: 200,
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
  eventContent: {
    padding: 20,
  },
  eventHeader: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eventTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMetaText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 16,
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.border.light,
  },
  creatorInfo: {
    flex: 1,
    gap: 8,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  interestsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestTagText: {
    fontSize: 12,
    color: Colors.coral,
    fontWeight: '600' as const,
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
  fabText: {
    fontSize: 32,
    fontWeight: '300' as const,
    color: Colors.text.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background.card,
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  totalScoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  totalScoreLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  totalScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  totalScoreText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.white,
  },
  dividerModal: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  breakdownItem: {
    marginBottom: 20,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 15,
    color: Colors.text.primary,
    fontWeight: '500' as const,
  },
  breakdownScore: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.coral,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.coral,
    borderRadius: 4,
  },
  sharedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  sharedTag: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sharedTagText: {
    fontSize: 12,
    color: Colors.coral,
    fontWeight: '600' as const,
  },
  whyMatchSection: {
    marginTop: 8,
    padding: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
  },
  whyMatchTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  whyMatchText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});
