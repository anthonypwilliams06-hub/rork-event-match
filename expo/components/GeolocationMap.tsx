import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { MapPin, Navigation, AlertCircle } from 'lucide-react-native';
import {
  getCurrentLocation,
  filterByRadius,
  getRadiusInMeters,
  convertRadius,
  Coordinates,
  RadiusUnit,
  LocationError,
} from '@/lib/geolocation';



export interface GeolocationMapProps<T> {
  items: T[];
  getItemCoords: (item: T) => { latitude?: number; longitude?: number };
  renderMarker: (item: T & { distance: number }) => React.ReactNode;
  onItemPress?: (item: T & { distance: number }) => void;
  initialRadius?: number;
  minRadius?: number;
  maxRadius?: number;
  defaultUnit?: RadiusUnit;
  showUnitToggle?: boolean;
  mapHeight?: number;
}

export default function GeolocationMap<T extends { id: string }>({
  items,
  getItemCoords,
  renderMarker,
  onItemPress,
  initialRadius = 10,
  minRadius = 1,
  maxRadius = 50,
  defaultUnit = 'miles',
  showUnitToggle = true,
  mapHeight = 400,
}: GeolocationMapProps<T>) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [unit, setUnit] = useState<RadiusUnit>(defaultUnit);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<LocationError | null>(null);


  useEffect(() => {
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      console.log('[GeolocationMap] Loading user location...');
      const location = await getCurrentLocation();
      setUserLocation(location.coords);
      console.log('[GeolocationMap] User location loaded:', location.coords);
    } catch (error) {
      console.error('[GeolocationMap] Error loading location:', error);
      setLocationError(error as LocationError);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const itemsWithCoords = useMemo(() => {
    return items
      .map((item) => ({
        ...item,
        ...getItemCoords(item),
      }))
      .filter((item) => item.latitude != null && item.longitude != null);
  }, [items, getItemCoords]);

  const filteredItems = useMemo(() => {
    if (!userLocation) return [];

    return filterByRadius(itemsWithCoords, userLocation, radius, unit);
  }, [itemsWithCoords, userLocation, radius, unit]);

  const mapRegion = useMemo(() => {
    if (!userLocation) {
      return {
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      };
    }

    const latitudeDelta = radius / 69;
    const longitudeDelta = radius / (69 * Math.cos(userLocation.latitude * (Math.PI / 180)));

    return {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: latitudeDelta * 2,
      longitudeDelta: longitudeDelta * 2,
    };
  }, [userLocation, radius]);

  const toggleUnit = () => {
    const newUnit = unit === 'miles' ? 'kilometers' : 'miles';
    const convertedRadius = convertRadius(radius, unit, newUnit);
    setUnit(newUnit);
    setRadius(convertedRadius);
  };

  const handleItemPress = (item: T & { distance: number }) => {
    onItemPress?.(item);
  };

  if (isLoadingLocation) {
    return (
      <View style={[styles.container, { height: mapHeight }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={[styles.container, { height: mapHeight }]}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Location Access Required</Text>
          <Text style={styles.errorMessage}>{locationError.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserLocation}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={[styles.container, { height: mapHeight }]}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#6B7280" />
          <Text style={styles.errorTitle}>Location Not Available</Text>
          <Text style={styles.errorMessage}>Unable to determine your location.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.mapContainer, { height: mapHeight }]}>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          region={mapRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          zoomEnabled
          scrollEnabled
        >
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </Marker>

          <Circle
            center={userLocation}
            radius={getRadiusInMeters(radius, unit)}
            strokeWidth={2}
            strokeColor="rgba(239, 68, 68, 0.5)"
            fillColor="rgba(239, 68, 68, 0.1)"
          />

          {filteredItems.map((item) => (
            <Marker
              key={item.id}
              coordinate={{
                latitude: item.latitude!,
                longitude: item.longitude!,
              }}
              onPress={() => handleItemPress(item)}
            >
              {renderMarker(item)}
            </Marker>
          ))}
        </MapView>

        <TouchableOpacity
          style={styles.myLocationButton}
          onPress={loadUserLocation}
        >
          <Navigation size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.radiusHeader}>
          <View style={styles.radiusInfo}>
            <MapPin size={20} color="#EF4444" />
            <Text style={styles.radiusValue}>
              {radius.toFixed(1)} {unit === 'miles' ? 'mi' : 'km'}
            </Text>
          </View>
          {showUnitToggle && (
            <TouchableOpacity style={styles.unitToggle} onPress={toggleUnit}>
              <Text style={styles.unitToggleText}>
                {unit === 'miles' ? 'Switch to km' : 'Switch to mi'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Slider
          style={styles.slider}
          minimumValue={minRadius}
          maximumValue={maxRadius}
          value={radius}
          onValueChange={setRadius}
          minimumTrackTintColor="#EF4444"
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor="#EF4444"
          step={0.5}
        />

        <View style={styles.rangeLabels}>
          <Text style={styles.rangeLabel}>
            {minRadius} {unit === 'miles' ? 'mi' : 'km'}
          </Text>
          <Text style={styles.rangeLabel}>
            {maxRadius} {unit === 'miles' ? 'mi' : 'km'}
          </Text>
        </View>

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'} within radius
          </Text>
        </View>
      </View>
    </View>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  mapContainer: {
    width: '100%',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  radiusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radiusValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#111827',
  },
  unitToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#4B5563',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  resultsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
    textAlign: 'center',
  },
});
