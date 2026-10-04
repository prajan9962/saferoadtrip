import { LeaderGpsDiagnostics, LeaderGpsUiState } from '../types';
import { GEOFENCE_CONFIG } from '../config/geofenceConfig';

export type LocationFreshness = 'CURRENT' | 'STALE' | 'UNAVAILABLE';
export type LocationPermissionStatus = 'GRANTED' | 'DENIED' | 'PROMPT';
export type LocationServicesStatus = 'ON' | 'OFF';
export type LocationSource = 'DEVICE_GPS' | 'LAST_KNOWN' | 'UNAVAILABLE';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: string;
  freshness: LocationFreshness;
  ageSeconds: number;
  source: LocationSource;
  isEmulator?: boolean;
}

export interface UserLocationDiagnostics {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  lastUpdatedSecondsAgo: number | null;
  lastUpdateTimestamp: string | null;
  freshness: LocationFreshness;
  permission: LocationPermissionStatus;
  services: LocationServicesStatus;
  gpsState: 'AVAILABLE' | 'UNAVAILABLE';
  backendSync: 'SYNCED' | 'PENDING' | 'FAILED';
  source: LocationSource;
  isLowAccuracy: boolean;
  isEmulator: boolean;
}

type LocationListener = (coords: LocationCoordinates | null) => void;

/**
 * SafeRoad+ Centralized Real-Device Location Provider & Telemetry Service
 *
 * STRICT INVARIANTS:
 * 1. NEVER returns hardcoded, mock, or fallback coordinates (e.g. Shimla or Delhi).
 * 2. If GPS is unavailable or denied, returns null / throws descriptive error.
 * 3. Central source of truth for Web and Android companion bridges.
 * 4. Clears all cached state upon user switch / logout.
 */
class LocationTrackingService {
  private watchId: number | null = null;
  private lastKnownLocation: LocationCoordinates | null = null;
  private permissionState: LocationPermissionStatus = 'PROMPT';
  private servicesEnabled: boolean = true;
  private isTrackingActive: boolean = false;
  private lastSyncSuccess: boolean = true;
  private listeners: Set<LocationListener> = new Set();
  private isCheckingPermission: boolean = false;

  // Staleness thresholds
  private readonly STALE_THRESHOLD_SECONDS = 15;
  private readonly UNAVAILABLE_THRESHOLD_SECONDS = 60;
  private readonly ACCURACY_WARN_THRESHOLD_METERS = 30;

  constructor() {
    // Initial permission check if browser allows
    if (typeof window !== 'undefined') {
      this.queryPermissionState().catch(() => {});
    }
  }

  /**
   * Subscribe to real-time location updates across components
   */
  public subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current known location
    listener(this.getFreshOrStaleLocation());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(coords: LocationCoordinates | null): void {
    this.listeners.forEach((listener) => {
      try {
        listener(coords);
      } catch (err) {
        console.error('[SafeRoad+ LocationService] Listener error:', err);
      }
    });
  }

  /**
   * Check runtime permission state
   */
  public async queryPermissionState(): Promise<LocationPermissionStatus> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.permissionState = 'DENIED';
      this.servicesEnabled = false;
      return 'DENIED';
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        this.permissionState = status.state === 'granted' ? 'GRANTED' : status.state === 'denied' ? 'DENIED' : 'PROMPT';
        status.onchange = () => {
          this.permissionState = status.state === 'granted' ? 'GRANTED' : status.state === 'denied' ? 'DENIED' : 'PROMPT';
          if (this.permissionState === 'DENIED') {
            this.lastKnownLocation = null;
            this.notifyListeners(null);
          }
        };
      }
    } catch {
      // Fallback for browsers without navigator.permissions for geolocation
    }
    return this.permissionState;
  }

  /**
   * Request a fresh, real GPS position from the device hardware.
   * NO fallback coordinates are ever returned.
   */
  public async getCurrentPosition(options?: PositionOptions): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        this.permissionState = 'DENIED';
        this.servicesEnabled = false;
        this.lastKnownLocation = null;
        this.notifyListeners(null);
        reject(new Error('Geolocation is not supported by your device or browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.permissionState = 'GRANTED';
          this.servicesEnabled = true;

          const now = Date.now();
          const posTime = pos.timestamp || now;
          const ageSeconds = Math.max(0, Math.floor((now - posTime) / 1000));
          const freshness: LocationFreshness =
            ageSeconds <= this.STALE_THRESHOLD_SECONDS ? 'CURRENT' : ageSeconds <= this.UNAVAILABLE_THRESHOLD_SECONDS ? 'STALE' : 'UNAVAILABLE';

          const coords: LocationCoordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 10,
            altitude: pos.coords.altitude ?? null,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
            timestamp: new Date(posTime).toISOString(),
            freshness,
            ageSeconds,
            source: 'DEVICE_GPS',
            isEmulator: this.detectEmulator()
          };

          this.lastKnownLocation = coords;
          this.notifyListeners(coords);
          resolve(coords);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            this.permissionState = 'DENIED';
            this.lastKnownLocation = null;
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            this.servicesEnabled = false;
          }
          this.notifyListeners(this.getFreshOrStaleLocation());
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
          ...options
        }
      );
    });
  }

  private heartbeatInterval: any = null;

  /**
   * Starts continuous real GPS location monitoring for an active trip session.
   * Emits live hardware coordinates on fix arrivals (~1s) and maintains heartbeat.
   */
  public startActiveTripTracking(
    tripId: string,
    isLeader: boolean,
    onLocationUpdate: (coords: LocationCoordinates) => void,
    onError?: (error: GeolocationPositionError | Error) => void
  ): void {
    if (this.isTrackingActive && this.watchId !== null) {
      return; // Already actively watching
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.permissionState = 'DENIED';
      this.servicesEnabled = false;
      onError?.(new Error('Geolocation is not supported on this device.'));
      return;
    }

    this.isTrackingActive = true;

    // 1. Trigger immediate fresh fix
    this.getCurrentPosition()
      .then((coords) => {
        if (isLeader) {
          console.log(
            `[SafeRoad+ GPS] Real Trip Leader location fix:\nLat: ${coords.latitude}, Lng: ${coords.longitude}, Acc: ±${coords.accuracy}m, Time: ${coords.timestamp}`
          );
        }
        onLocationUpdate(coords);
      })
      .catch((err) => {
        onError?.(err);
      });

    // 2. Register continuous high-accuracy watchPosition with zero maximumAge
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.permissionState = 'GRANTED';
        this.servicesEnabled = true;

        const now = Date.now();
        const posTime = pos.timestamp || now;
        const ageSeconds = Math.max(0, Math.floor((now - posTime) / 1000));
        const freshness: LocationFreshness =
          ageSeconds <= this.STALE_THRESHOLD_SECONDS ? 'CURRENT' : ageSeconds <= this.UNAVAILABLE_THRESHOLD_SECONDS ? 'STALE' : 'UNAVAILABLE';

        const coords: LocationCoordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 10,
          altitude: pos.coords.altitude ?? null,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? null,
          timestamp: new Date(posTime).toISOString(),
          freshness,
          ageSeconds,
          source: 'DEVICE_GPS',
          isEmulator: this.detectEmulator()
        };

        this.lastKnownLocation = coords;
        this.notifyListeners(coords);

        if (isLeader) {
          console.log(
            `[SafeRoad+ GPS] Real Trip Leader position update:\nLat: ${coords.latitude}, Lng: ${coords.longitude}, Acc: ±${coords.accuracy}m`
          );
        }

        onLocationUpdate(coords);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          this.permissionState = 'DENIED';
          this.lastKnownLocation = null;
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          this.servicesEnabled = false;
        }
        this.notifyListeners(this.getFreshOrStaleLocation());
        onError?.(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // 3. Cadence heartbeat timer (~1s) ensuring continuous freshness evaluation
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.lastKnownLocation && this.isTrackingActive) {
        const now = Date.now();
        const locTime = new Date(this.lastKnownLocation.timestamp).getTime();
        const ageSeconds = Math.max(0, Math.floor((now - locTime) / 1000));
        const freshness: LocationFreshness =
          ageSeconds <= this.STALE_THRESHOLD_SECONDS ? 'CURRENT' : ageSeconds <= this.UNAVAILABLE_THRESHOLD_SECONDS ? 'STALE' : 'UNAVAILABLE';

        this.lastKnownLocation.ageSeconds = ageSeconds;
        this.lastKnownLocation.freshness = freshness;
        this.notifyListeners(this.lastKnownLocation);
      }
    }, 1000);
  }

  /**
   * Stops active location tracking
   */
  public stopActiveTripTracking(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isTrackingActive = false;
  }

  /**
   * Marks backend location sync success or failure for diagnostics
   */
  public setBackendSyncStatus(success: boolean): void {
    this.lastSyncSuccess = success;
  }

  /**
   * Clear all cached location data on logout / user switch.
   * Ensures User B NEVER inherits User A's location data.
   */
  public clearSession(): void {
    this.stopActiveTripTracking();
    this.lastKnownLocation = null;
    this.notifyListeners(null);
    console.log('[SafeRoad+ LocationService] Location session cleared for user transition.');
  }

  /**
   * Returns last known location if still within freshness limits, or null
   */
  public getFreshOrStaleLocation(): LocationCoordinates | null {
    if (!this.lastKnownLocation) return null;

    const now = Date.now();
    const locTime = new Date(this.lastKnownLocation.timestamp).getTime();
    const ageSeconds = Math.max(0, Math.floor((now - locTime) / 1000));

    if (ageSeconds > this.UNAVAILABLE_THRESHOLD_SECONDS) {
      return null;
    }

    return {
      ...this.lastKnownLocation,
      ageSeconds,
      freshness: ageSeconds <= this.STALE_THRESHOLD_SECONDS ? 'CURRENT' : 'STALE',
      source: 'LAST_KNOWN'
    };
  }

  public getLastKnownLocation(): LocationCoordinates | null {
    return this.lastKnownLocation;
  }

  /**
   * Comprehensive Diagnostics for current user's device GPS
   */
  public getUserDiagnostics(): UserLocationDiagnostics {
    const loc = this.getFreshOrStaleLocation();
    const isAvail = loc !== null;

    return {
      latitude: loc ? loc.latitude : null,
      longitude: loc ? loc.longitude : null,
      accuracy: loc ? loc.accuracy : null,
      lastUpdatedSecondsAgo: loc ? loc.ageSeconds : null,
      lastUpdateTimestamp: loc ? loc.timestamp : null,
      freshness: loc ? loc.freshness : 'UNAVAILABLE',
      permission: this.permissionState,
      services: this.servicesEnabled ? 'ON' : 'OFF',
      gpsState: isAvail ? 'AVAILABLE' : 'UNAVAILABLE',
      backendSync: this.lastSyncSuccess ? 'SYNCED' : 'FAILED',
      source: loc ? loc.source : 'UNAVAILABLE',
      isLowAccuracy: loc ? loc.accuracy > this.ACCURACY_WARN_THRESHOLD_METERS : false,
      isEmulator: this.detectEmulator()
    };
  }

  /**
   * Compute comprehensive Leader GPS Diagnostics for Dynamic Safe Bubble
   */
  public getLeaderDiagnostics(
    leaderLat?: number | null,
    leaderLng?: number | null,
    leaderAccuracy?: number | null,
    leaderLastUpdate?: string | null,
    isLeaderUser: boolean = false,
    networkOnline: boolean = true
  ): LeaderGpsDiagnostics {
    const now = Date.now();
    const lastUpdateMs = leaderLastUpdate ? new Date(leaderLastUpdate).getTime() : null;
    const ageSeconds = lastUpdateMs ? Math.max(0, Math.floor((now - lastUpdateMs) / 1000)) : null;
    const isStale = ageSeconds !== null && ageSeconds > GEOFENCE_CONFIG.LEADER_LOCATION_MAX_AGE_SECONDS;
    const accuracy = leaderAccuracy ?? (isLeaderUser && this.lastKnownLocation ? this.lastKnownLocation.accuracy : null);
    const accuracySufficient = accuracy === null || accuracy <= GEOFENCE_CONFIG.ACCURACY_THRESHOLD_METERS;

    let uiState: LeaderGpsUiState = 'LEADER_LOCATION_UNAVAILABLE';
    let statusMessage = 'Trip Leader location is currently unavailable.';

    if (!networkOnline) {
      uiState = 'LEADER_LOCATION_NETWORK_UNAVAILABLE';
      statusMessage = 'Unable to synchronize Leader location (Network Offline).';
    } else if (isLeaderUser && this.permissionState === 'DENIED') {
      uiState = 'LEADER_LOCATION_PERMISSION_DENIED';
      statusMessage = 'Trip Leader location permission is disabled.';
    } else if (isLeaderUser && !this.servicesEnabled) {
      uiState = 'LEADER_LOCATION_SERVICES_DISABLED';
      statusMessage = 'GPS/location services are disabled.';
    } else if (leaderLat === null || leaderLat === undefined || leaderLng === null || leaderLng === undefined) {
      uiState = 'LEADER_LOCATION_LOADING';
      statusMessage = 'Getting Trip Leader location...';
    } else if (accuracy !== null && !accuracySufficient) {
      uiState = 'LEADER_LOCATION_ACCURACY_INSUFFICIENT';
      statusMessage = `Leader GPS accuracy is insufficient (±${accuracy.toFixed(1)}m > ${GEOFENCE_CONFIG.ACCURACY_THRESHOLD_METERS}m threshold).`;
    } else if (isStale) {
      uiState = 'LEADER_LOCATION_STALE';
      statusMessage = `Leader location is stale (updated ${ageSeconds}s ago).`;
    } else {
      uiState = 'LEADER_LOCATION_AVAILABLE';
      statusMessage = 'Leader location available';
    }

    return {
      permission: this.permissionState,
      services: this.servicesEnabled ? 'ON' : 'OFF',
      latitude: leaderLat ?? (isLeaderUser && this.lastKnownLocation ? this.lastKnownLocation.latitude : null),
      longitude: leaderLng ?? (isLeaderUser && this.lastKnownLocation ? this.lastKnownLocation.longitude : null),
      accuracy: accuracy,
      lastUpdateSecondsAgo: ageSeconds,
      lastUpdateTimestamp: leaderLastUpdate ?? null,
      backendSync: this.lastSyncSuccess ? 'SUCCESS' : 'FAILED',
      isStale: isStale || (leaderLat === null || leaderLat === undefined),
      uiState,
      statusMessage
    };
  }

  private detectEmulator(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return ua.includes('Android') && (ua.includes('sdk_gphone') || ua.includes('Emulator') || ua.includes('Genymotion'));
  }
}

export const locationTrackingService = new LocationTrackingService();
