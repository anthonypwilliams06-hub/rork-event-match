import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MapPin, Calendar, Users, DollarSign } from 'lucide-react-native';
import GeolocationMap from '@/components/GeolocationMap';
import { MOCK_EVENTS } from '@/mocks/data';
import { Event } from '@/types';
import { formatDistance } from '@/lib/geolocation';

export default function GeolocationDemo() {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = React.useState<(Event & { distance: number }) | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMarkerColor = (event: Event) => {
    if (event.status === 'full') return '#6B7280';
    if (event.isPaid) return '#10B981';
    return '#EF4444';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Geolocation Demo',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#000000',
        }} 
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Find Events Near You</Text>
          <Text style={styles.subtitle}>
            Adjust the radius slider to discover events in your area
          </Text>
        </View>

        <GeolocationMap<Event>
          items={MOCK_EVENTS}
          getItemCoords={(event) => ({
            latitude: event.latitude,
            longitude: event.longitude,
          })}
          renderMarker={(event) => (
            <View style={styles.markerContainer}>
              <View 
                style={[
                  styles.marker,
                  { backgroundColor: getMarkerColor(event) }
                ]}
              >
                <MapPin size={16} color="#FFFFFF" />
              </View>
            </View>
          )}
          onItemPress={(event) => {
            console.log('[GeolocationDemo] Event pressed:', event.title);
            setSelectedEvent(event);
          }}
          initialRadius={25}
          minRadius={1}
          maxRadius={100}
          defaultUnit="miles"
          showUnitToggle={true}
          mapHeight={500}
        />

        {selectedEvent && (
          <View style={styles.eventCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {selectedEvent.title}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedEvent(null)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.distanceBadge}>
              <MapPin size={14} color="#EF4444" />
              <Text style={styles.distanceText}>
                {formatDistance(selectedEvent.distance, 'miles')} away
              </Text>
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.detailRow}>
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  {formatDate(selectedEvent.date)} • {selectedEvent.time}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {selectedEvent.location}
                </Text>
              </View>

              {selectedEvent.capacity && (
                <View style={styles.detailRow}>
                  <Users size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {selectedEvent.spotsAvailable}/{selectedEvent.capacity} spots available
                  </Text>
                </View>
              )}

              {selectedEvent.isPaid && selectedEvent.price && (
                <View style={styles.detailRow}>
                  <DollarSign size={16} color="#10B981" />
                  <Text style={styles.priceText}>${selectedEvent.price}</Text>
                </View>
              )}
            </View>

            <Text style={styles.description} numberOfLines={3}>
              {selectedEvent.description}
            </Text>

            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => router.push(`/event-details/${selectedEvent.id}`)}
            >
              <Text style={styles.viewButtonText}>View Event Details</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet} />
            <Text style={styles.infoText}>
              Grant location permission to see events near you
            </Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet} />
            <Text style={styles.infoText}>
              Use the slider to adjust your search radius
            </Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet} />
            <Text style={styles.infoText}>
              Tap markers on the map to view event details
            </Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet} />
            <Text style={styles.infoText}>
              Switch between miles and kilometers with one tap
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  eventCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
    marginRight: 12,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  cardDetails: {
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10B981',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  viewButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  infoSection: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginTop: 7,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});
