import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Stack, useRouter } from 'expo-router';
import { X, MapPin, Calendar, Users, DollarSign } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { Event, EventWithMatch } from '@/types';

const { width, height } = Dimensions.get('window');

export default function MapViewScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: eventsData, isLoading } = trpc.events.list.useQuery({ token: token || '' });

  const eventsWithCoords = useMemo(() => {
    if (!eventsData) return [];
    
    const eventsList = eventsData.map((item: Event | EventWithMatch) => {
      return 'event' in item ? item.event : item;
    });
    
    return eventsList
      .map((event: Event) => {
        const baseLatNY = 40.7128 as const;
        const baseLngNY = -74.006 as const;
        const randomOffsetLat = (Math.random() - 0.5) * 0.1;
        const randomOffsetLng = (Math.random() - 0.5) * 0.1;
        
        return {
          ...event,
          latitude: event.latitude || baseLatNY + randomOffsetLat,
          longitude: event.longitude || baseLngNY + randomOffsetLng,
        };
      })
      .filter((event: Event) => event.status !== 'cancelled' && !event.isDraft);
  }, [eventsData]);

  const initialRegion = {
    latitude: 40.7128,
    longitude: -74.006,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  const getMarkerColor = (event: Event) => {
    if (event.status === 'full') return '#6B7280';
    if (event.isPaid) return '#10B981';
    return '#EF4444';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Nearby Events',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#000000',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <X size={24} color="#000000" />
            </TouchableOpacity>
          ),
        }} 
      />

      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {eventsWithCoords.map((event) => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude,
            }}
            pinColor={getMarkerColor(event)}
            onPress={() => setSelectedEvent(event)}
          >
            <Callout onPress={() => router.push(`/event-details/${event.id}`)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                <View style={styles.calloutRow}>
                  <Calendar size={14} color="#6B7280" />
                  <Text style={styles.calloutText}>{formatDate(event.date)}</Text>
                </View>
                {event.capacity && (
                  <View style={styles.calloutRow}>
                    <Users size={14} color="#6B7280" />
                    <Text style={styles.calloutText}>
                      {event.spotsAvailable}/{event.capacity} spots
                    </Text>
                  </View>
                )}
                {event.isPaid && (
                  <View style={styles.calloutRow}>
                    <DollarSign size={14} color="#10B981" />
                    <Text style={styles.calloutPrice}>${event.price}</Text>
                  </View>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {selectedEvent && (
        <View style={styles.floatingCard}>
          <TouchableOpacity
            style={styles.cardContent}
            onPress={() => router.push(`/event-details/${selectedEvent.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {selectedEvent.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.detailRow}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {selectedEvent.location}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  {formatDate(selectedEvent.date)} • {selectedEvent.time}
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

              {selectedEvent.isPaid && (
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>${selectedEvent.price}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Event</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    marginRight: 8,
  },
  map: {
    flex: 1,
    width: width,
    height: height,
  },
  calloutContainer: {
    width: 200,
    padding: 12,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000000',
    marginBottom: 8,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  calloutText: {
    fontSize: 13,
    color: '#6B7280',
  },
  calloutPrice: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600' as const,
  },
  floatingCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#000000',
    marginRight: 12,
  },
  cardDetails: {
    gap: 8,
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
  priceTag: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#10B981',
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
});
