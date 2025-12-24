import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  coords: Coordinates;
  accuracy?: number;
  timestamp: number;
}

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
}

export type RadiusUnit = 'miles' | 'kilometers';

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_MILES = 3959;
const KM_TO_MILES = 0.621371;
const MILES_TO_KM = 1.60934;

export async function requestLocationPermission(): Promise<boolean> {
  try {
    console.log('[Geolocation] Requesting location permission...');
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    console.log('[Geolocation] Permission status:', status);
    return status === 'granted';
  } catch (error) {
    console.error('[Geolocation] Permission error:', error);
    return false;
  }
}

export async function getCurrentLocation(): Promise<LocationResult> {
  console.log('[Geolocation] Getting current location...');
  
  try {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      throw {
        code: 'PERMISSION_DENIED',
        message: 'Location permission was denied. Please enable location access in your device settings.',
      } as LocationError;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    console.log('[Geolocation] Location obtained:', location.coords);

    return {
      coords: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      accuracy: location.coords.accuracy || undefined,
      timestamp: location.timestamp,
    };
  } catch (error: any) {
    console.error('[Geolocation] Error getting location:', error);
    
    if (error.code === 'PERMISSION_DENIED') {
      throw error;
    }
    
    throw {
      code: 'POSITION_UNAVAILABLE',
      message: 'Unable to determine your location. Please check your device settings and try again.',
    } as LocationError;
  }
}

export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates,
  unit: RadiusUnit = 'miles'
): number {
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const earthRadius = unit === 'miles' ? EARTH_RADIUS_MILES : EARTH_RADIUS_KM;
  const distance = earthRadius * c;

  return Math.round(distance * 100) / 100;
}

export function convertRadius(value: number, from: RadiusUnit, to: RadiusUnit): number {
  if (from === to) return value;
  
  if (from === 'miles' && to === 'kilometers') {
    return Math.round(value * MILES_TO_KM * 100) / 100;
  }
  
  return Math.round(value * KM_TO_MILES * 100) / 100;
}

export function filterByRadius<T extends { latitude?: number; longitude?: number }>(
  items: T[],
  centerPoint: Coordinates,
  radiusValue: number,
  unit: RadiusUnit = 'miles'
): (T & { distance: number })[] {
  console.log('[Geolocation] Filtering items by radius:', { 
    centerPoint, 
    radius: radiusValue, 
    unit,
    itemCount: items.length 
  });

  const itemsWithDistance = items
    .filter((item) => item.latitude != null && item.longitude != null)
    .map((item) => {
      const distance = calculateDistance(
        centerPoint,
        { latitude: item.latitude!, longitude: item.longitude! },
        unit
      );
      
      return {
        ...item,
        distance,
      };
    })
    .filter((item) => item.distance <= radiusValue)
    .sort((a, b) => a.distance - b.distance);

  console.log('[Geolocation] Filtered results:', itemsWithDistance.length);
  
  return itemsWithDistance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function formatDistance(distance: number, unit: RadiusUnit): string {
  if (distance < 0.1) {
    return unit === 'miles' ? 'Less than 0.1 mi' : 'Less than 0.1 km';
  }
  
  const unitLabel = unit === 'miles' ? 'mi' : 'km';
  return `${distance.toFixed(1)} ${unitLabel}`;
}

export function getRadiusInMeters(radius: number, unit: RadiusUnit): number {
  const radiusInKm = unit === 'miles' ? radius * MILES_TO_KM : radius;
  return radiusInKm * 1000;
}
