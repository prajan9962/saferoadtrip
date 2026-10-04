import {
  UserProfile,
  Trip,
  TripMember,
  TripMessage,
  SOSRecord,
  AIDestinationSafetyGuide,
  NotificationItem,
  AuditLog,
  VerifiedHotel,
  SafeRouteOption,
  TripState,
  AuthorityType,
  SOSStatus,
  BoundaryStatus,
  EmergencySmsNotification,
  TripReview
} from '../src/types';

export interface LocationRecord {
  id: string;
  tripId: string;
  userId: string;
  userName: string;
  role: 'LEADER' | 'MEMBER';
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: string;
  distanceFromLeaderMeters?: number;
  boundaryStatus?: BoundaryStatus;
  boundaryResponse?: 'I_AM_SAFE' | 'NEED_HELP' | null;
  isStale?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type TripMemberLocation = LocationRecord;

// Global Operational Database Store for server runtime persistence
class DatabaseStore {
  public users: Map<string, UserProfile> = new Map();
  public firebaseUidToUserId: Map<string, string> = new Map();
  public trips: Map<string, Trip> = new Map();
  public tripMembers: Map<string, TripMember[]> = new Map(); // tripId -> trip members
  public tripMemberLocations: Map<string, Map<string, TripMemberLocation>> = new Map(); // tripId -> (userId -> TripMemberLocation)
  public tripMessages: Map<string, TripMessage[]> = new Map(); // tripId -> trip group messages
  public sosRecords: Map<string, SOSRecord> = new Map();
  public emergencySmsRecords: Map<string, EmergencySmsNotification> = new Map(); // sosId -> EmergencySmsNotification (primary/latest)
  public emergencySmsDeliveryList: EmergencySmsNotification[] = []; // All individual recipient SMS delivery attempts
  public aiGuides: Map<string, AIDestinationSafetyGuide> = new Map(); // destination_lang -> guide
  public notifications: Map<string, NotificationItem[]> = new Map(); // userId -> notifications
  public locationHistory: LocationRecord[] = []; // PostgreSQL trip_locations audit table simulation (capped)
  public latestLeaderLocations: Map<string, LocationRecord> = new Map(); // tripId -> latest valid leader location
  public auditLogs: AuditLog[] = [];
  public tripReviews: Map<string, TripReview[]> = new Map(); // tripId -> TripReview[]

  constructor() {
    // Starts with clean, real-world database state (no hardcoded demo trips, users, or alerts)
  }

  public saveTripReview(review: TripReview) {
    const list = this.tripReviews.get(review.tripId) || [];
    const existingIndex = list.findIndex(r => r.userId === review.userId);
    if (existingIndex >= 0) {
      list[existingIndex] = review;
    } else {
      list.push(review);
    }
    this.tripReviews.set(review.tripId, list);
  }

  public getTripReviews(tripId: string): TripReview[] {
    return this.tripReviews.get(tripId) || [];
  }

  public getUserTripReview(tripId: string, userId: string): TripReview | undefined {
    const list = this.tripReviews.get(tripId) || [];
    return list.find(r => r.userId === userId);
  }

  public getDestinationReviews(destinationName: string): TripReview[] {
    const cleanDest = destinationName.trim().toLowerCase();
    const results: TripReview[] = [];
    for (const reviews of this.tripReviews.values()) {
      for (const r of reviews) {
        if (r.destination && (r.destination.toLowerCase().includes(cleanDest) || cleanDest.includes(r.destination.toLowerCase()))) {
          results.push(r);
        }
      }
    }
    return results;
  }

  public saveEmergencySmsRecord(record: EmergencySmsNotification) {
    const existingIndex = this.emergencySmsDeliveryList.findIndex(
      r => (record.idempotencyKey && r.idempotencyKey === record.idempotencyKey) || r.id === record.id
    );
    if (existingIndex >= 0) {
      this.emergencySmsDeliveryList[existingIndex] = record;
    } else {
      this.emergencySmsDeliveryList.push(record);
    }
    // Also keep map updated for latest sosId lookup
    this.emergencySmsRecords.set(record.sosId, record);
  }

  public getEmergencySmsForSos(sosId: string): EmergencySmsNotification[] {
    return this.emergencySmsDeliveryList.filter(r => r.sosId === sosId);
  }

  public getEmergencySmsByIdempotencyKey(key: string): EmergencySmsNotification | undefined {
    return this.emergencySmsDeliveryList.find(r => r.idempotencyKey === key);
  }

  public logAudit(userId: string | undefined, userName: string | undefined, action: string, details: Record<string, any>) {
    const log: AuditLog = {
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      userId,
      userName,
      action,
      details,
      createdAt: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
  }

  // Generate unique 6-character trip join code
  public generateTripCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (Array.from(this.trips.values()).some(t => t.code === code && !t.isArchived));
    return code;
  }
}

export const db = new DatabaseStore();
