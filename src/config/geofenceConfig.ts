/**
 * SafeRoad+ Dynamic Safe Bubble & Geofencing Configuration
 * Centralized parameters for dynamic leader-centered geofencing
 */
export const GEOFENCE_CONFIG = {
  // Safe Bubble radius in meters centered on the Trip Leader's real-time position
  SAFE_BUBBLE_RADIUS_METERS: 100,

  // GPS polling intervals
  LEADER_LOCATION_UPDATE_INTERVAL_MS: 3000,
  MEMBER_LOCATION_UPDATE_INTERVAL_MS: 5000,
  BOUNDARY_RECHECK_INTERVAL_MS: 4000,

  // GPS Accuracy threshold: if accuracy circle > 35m, flag LOCATION_ACCURACY_INSUFFICIENT
  // and suppress false boundary alerts
  ACCURACY_THRESHOLD_METERS: 35,

  // Leader stale location threshold (60 seconds)
  LEADER_LOCATION_MAX_AGE_SECONDS: 60,
  MAX_STALE_LEADER_THRESHOLD_MS: 60000,

  // Anti-false alert debounce: consecutive out-of-bounds readings required before triggering alert
  BREACH_DEBOUNCE_COUNT: 2,

  // Earth radius constant for Haversine geographic calculation
  EARTH_RADIUS_METERS: 6371000
};
