import { Trip, TripMember, BoundaryStatus, LeaderLocationStatus } from '../src/types';
import { GEOFENCE_CONFIG } from '../src/config/geofenceConfig';

/**
 * Calculates accurate geographic Haversine distance in meters between two GPS coordinates
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = GEOFENCE_CONFIG.EARTH_RADIUS_METERS; // 6,371,000 meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface DynamicBubbleEvaluationResult {
  distanceMeters: number;
  boundaryStatus: BoundaryStatus;
  isOutside: boolean;
  shouldAlert: boolean;
  accuracySufficient: boolean;
  leaderStatus: LeaderLocationStatus;
  reason?: string;
}

/**
 * Determines Leader Location Status (LIVE, LAST_KNOWN, or UNAVAILABLE)
 */
export function getLeaderLocationStatus(trip: Trip): {
  status: LeaderLocationStatus;
  lat?: number;
  lng?: number;
  accuracy?: number;
  lastUpdate?: string;
  isStale: boolean;
  ageSeconds: number;
  accuracySufficient: boolean;
  uiState: string;
  statusMessage: string;
} {
  if (trip.leaderLatitude === undefined || trip.leaderLongitude === undefined || trip.leaderLatitude === null || trip.leaderLongitude === null) {
    return {
      status: 'UNAVAILABLE',
      isStale: true,
      ageSeconds: 999999,
      accuracySufficient: false,
      uiState: 'LEADER_LOCATION_UNAVAILABLE',
      statusMessage: 'Trip Leader location is currently unavailable.'
    };
  }

  const now = Date.now();
  const lastUpdateTime = trip.leaderLastLocationUpdate ? new Date(trip.leaderLastLocationUpdate).getTime() : 0;
  const ageMs = now - lastUpdateTime;
  const ageSeconds = Math.max(0, Math.floor(ageMs / 1000));
  const isStale = ageMs > GEOFENCE_CONFIG.MAX_STALE_LEADER_THRESHOLD_MS;
  const accuracy = trip.leaderAccuracyMeters !== undefined ? trip.leaderAccuracyMeters : 8;
  const accuracySufficient = accuracy <= GEOFENCE_CONFIG.ACCURACY_THRESHOLD_METERS;

  let uiState = 'LEADER_LOCATION_AVAILABLE';
  let statusMessage = 'Leader location available';

  if (!accuracySufficient) {
    uiState = 'LEADER_LOCATION_ACCURACY_INSUFFICIENT';
    statusMessage = `Leader GPS accuracy is insufficient (±${accuracy.toFixed(1)}m > ${GEOFENCE_CONFIG.ACCURACY_THRESHOLD_METERS}m threshold).`;
  } else if (isStale) {
    uiState = 'LEADER_LOCATION_STALE';
    statusMessage = `Leader location is stale (updated ${ageSeconds}s ago).`;
  }

  return {
    status: isStale ? 'LAST_KNOWN' : 'LIVE',
    lat: trip.leaderLatitude,
    lng: trip.leaderLongitude,
    accuracy,
    lastUpdate: trip.leaderLastLocationUpdate,
    isStale,
    ageSeconds,
    accuracySufficient,
    uiState,
    statusMessage
  };
}

/**
 * Evaluates dynamic safe bubble status for a trip member relative to the current Trip Leader location.
 */
export function evaluateDynamicSafeBubble(
  member: TripMember,
  trip: Trip,
  customRadiusMeters?: number
): DynamicBubbleEvaluationResult {
  const radius = customRadiusMeters || trip.safeBubbleRadiusMeters || GEOFENCE_CONFIG.SAFE_BUBBLE_RADIUS_METERS;
  const leaderLoc = getLeaderLocationStatus(trip);

  // 1. Leader location unavailable
  if (leaderLoc.status === 'UNAVAILABLE' || leaderLoc.lat === undefined || leaderLoc.lng === undefined) {
    return {
      distanceMeters: 0,
      boundaryStatus: 'LOCATION_UNAVAILABLE',
      isOutside: false,
      shouldAlert: false,
      accuracySufficient: true,
      leaderStatus: 'UNAVAILABLE',
      reason: 'Trip Leader location is currently unavailable.'
    };
  }

  // 2. Member location unavailable
  if (member.lastLatitude === undefined || member.lastLongitude === undefined) {
    return {
      distanceMeters: 0,
      boundaryStatus: 'LOCATION_UNAVAILABLE',
      isOutside: false,
      shouldAlert: false,
      accuracySufficient: true,
      leaderStatus: leaderLoc.status,
      reason: 'Member location is currently unavailable.'
    };
  }

  // 3. GPS Accuracy Check - prevent false alerts due to noisy GPS reading
  const accuracy = member.accuracyMeters || 10;
  if (accuracy > GEOFENCE_CONFIG.ACCURACY_THRESHOLD_METERS) {
    return {
      distanceMeters: 0,
      boundaryStatus: 'LOCATION_ACCURACY_INSUFFICIENT',
      isOutside: false,
      shouldAlert: false,
      accuracySufficient: false,
      leaderStatus: leaderLoc.status,
      reason: `Location accuracy insufficient (${accuracy.toFixed(1)}m > ${GEOFENCE_CONFIG.ACCURACY_THRESHOLD_METERS}m threshold).`
    };
  }

  // 4. Calculate accurate Haversine distance to the Trip Leader's current position
  const distance = calculateHaversineDistanceMeters(
    member.lastLatitude,
    member.lastLongitude,
    leaderLoc.lat,
    leaderLoc.lng
  );
  const roundedDist = Math.round(distance);
  const isOutside = roundedDist > radius;

  if (!isOutside) {
    member.breachStreak = 0;
    return {
      distanceMeters: roundedDist,
      boundaryStatus: 'INSIDE_BUBBLE',
      isOutside: false,
      shouldAlert: false,
      accuracySufficient: true,
      leaderStatus: leaderLoc.status
    };
  }

  // 5. Member is outside: apply debounce verification
  const currentStreak = (member.breachStreak || 0) + 1;
  member.breachStreak = currentStreak;

  // Only trigger alert if breach has persisted for the configured debounce count
  const shouldAlert = currentStreak >= GEOFENCE_CONFIG.BREACH_DEBOUNCE_COUNT;

  return {
    distanceMeters: roundedDist,
    boundaryStatus: 'OUTSIDE_BUBBLE',
    isOutside: true,
    shouldAlert,
    accuracySufficient: true,
    leaderStatus: leaderLoc.status,
    reason: `Member is ${roundedDist}m away from the Trip Leader (Safe Bubble: ${radius}m).`
  };
}

/**
 * Creates a GeoJSON Polygon circle around the center coordinate (Trip Leader)
 * for rendering on MapLibre GL
 */
export function createGeoJsonCircle(
  centerLng: number,
  centerLat: number,
  radiusInMeters: number,
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const distanceX = radiusInMeters / (111.32 * 1000 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusInMeters / (110.574 * 1000);

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLng + x, centerLat + y]);
  }
  // Close the loop
  coords.push(coords[0]);

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };
}
