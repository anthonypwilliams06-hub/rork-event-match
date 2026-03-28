export function approximateCoordinates(
  latitude: number,
  longitude: number,
  radiusMiles: number = 3
): { lat: number; lng: number } {
  const earthRadiusMiles = 3959;
  const latRadians = (latitude * Math.PI) / 180;
  
  const randomAngle = Math.random() * 2 * Math.PI;
  const randomRadius = Math.random() * radiusMiles;
  
  const deltaLat = (randomRadius * Math.cos(randomAngle)) / earthRadiusMiles * (180 / Math.PI);
  const deltaLng = (randomRadius * Math.sin(randomAngle)) / (earthRadiusMiles * Math.cos(latRadians)) * (180 / Math.PI);
  
  return {
    lat: latitude + deltaLat,
    lng: longitude + deltaLng,
  };
}

export function getApproximateLocation(location: string): string {
  const parts = location.split(',');
  if (parts.length > 1) {
    return parts.slice(-2).join(',').trim();
  }
  return location;
}

export function shouldShowExactLocation(
  isOwner: boolean,
  hasRSVP: boolean,
  rsvpStatus?: 'going' | 'interested' | 'not_going' | 'waitlist' | null
): boolean {
  if (isOwner) return true;
  if (!hasRSVP) return false;
  return rsvpStatus === 'going';
}
