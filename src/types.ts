export type UserRole = 'LEADER' | 'MEMBER';
export type MemberStatus = 'APPROVED' | 'LEFT';
export type TripState = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type TransportMode = 'Car' | 'Bus' | 'Train' | 'Flight';
export type AuthorityType = 'POLICE' | 'HOSPITAL' | 'FIRE_RESCUE';
export type SOSStatus =
  | 'INITIATED'
  | 'CANCELLED'
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'PENDING_SYNC';

export type BoundaryStatus =
  | 'INSIDE_BUBBLE'
  | 'OUTSIDE_BUBBLE'
  | 'LOCATION_UNAVAILABLE'
  | 'LOCATION_ACCURACY_INSUFFICIENT';

export type LeaderLocationStatus = 'LIVE' | 'LAST_KNOWN' | 'UNAVAILABLE';

export type LeaderGpsUiState =
  | 'LEADER_LOCATION_LOADING'
  | 'LEADER_LOCATION_AVAILABLE'
  | 'LEADER_LOCATION_PERMISSION_DENIED'
  | 'LEADER_LOCATION_SERVICES_DISABLED'
  | 'LEADER_LOCATION_NETWORK_UNAVAILABLE'
  | 'LEADER_LOCATION_STALE'
  | 'LEADER_LOCATION_UNAVAILABLE'
  | 'LEADER_LOCATION_ACCURACY_INSUFFICIENT';

export interface LeaderGpsDiagnostics {
  permission: 'GRANTED' | 'DENIED' | 'PROMPT';
  services: 'ON' | 'OFF';
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  lastUpdateSecondsAgo: number | null;
  lastUpdateTimestamp: string | null;
  backendSync: 'SUCCESS' | 'FAILED' | 'PENDING';
  isStale: boolean;
  uiState: LeaderGpsUiState;
  statusMessage: string;
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  countryCode?: string;
  phoneNumber?: string;
  phone: string; // Full normalized E.164 (e.g. +919876543210)
  email?: string;
  preferredNotificationMethod: 'SMS' | 'EMAIL' | 'BOTH' | 'CALL';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserMedicalInfo {
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodGroup: string;
  medicalConditions: string;
  allergies: string;
}

export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string;
  phone: string;
  name: string;
  photoURL?: string;
  age: number;
  gender: string;
  preferredLanguage: string;
  medicalInfo: UserMedicalInfo;
  emergencyContact?: EmergencyContact;
  fcmToken?: string;
  isFcmTokenValid?: boolean;
}

export interface VerifiedHotel {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  latitude: number;
  longitude: number;
  safetyScore?: number;
  priceRange?: string;
  safetyHighlights?: string[];
  securityFeatures?: string[];
  aiRecommendationReason?: string;
  suitability?: string;
  proximityToEmergency?: string;
  isAiRecommended?: boolean;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  userName: string;
  userPhone: string;
  role: UserRole;
  status: MemberStatus;
  joinedAt: string;
  lastLatitude?: number;
  lastLongitude?: number;
  accuracyMeters?: number;
  lastLocationUpdate?: string;
  distanceFromLeaderMeters?: number;
  boundaryStatus?: BoundaryStatus;
  boundaryResponse?: 'I_AM_SAFE' | 'NEED_HELP' | null;
  breachStreak?: number;
  fcmToken?: string;
  isFcmTokenValid?: boolean;
}

export interface SafeRouteOption {
  id: string;
  routeName: string;
  distanceKm: number;
  estimatedTimeMins: number;
  safetyScore: number; // 0 - 100
  riskFactors: string[];
  safetyHighlights: string[];
  isRecommendedByAI: boolean;
  waypoints: { lat: number; lng: number }[];
}

export interface Trip {
  id: string;
  code: string;
  destination: string;
  transportMode: TransportMode;
  targetMembersCount: number;
  currentMembersCount: number;
  leaderId: string;
  leaderName: string;
  leaderLatitude?: number;
  leaderLongitude?: number;
  leaderAccuracyMeters?: number;
  leaderLastLocationUpdate?: string;
  startDate: string;
  endDate: string;
  status: TripState;
  safeBubbleRadiusMeters: number;
  hotel?: VerifiedHotel;
  selectedRoute?: SafeRouteOption;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  members?: TripMember[];
}

export interface SOSAcknowledgement {
  userId: string;
  userName: string;
  role: UserRole;
  timestamp: string;
}

export interface SOSRecipientDelivery {
  userId: string;
  userName: string;
  role: UserRole;
  fcmToken?: string;
  fcmTokenValid: boolean;
  delivered: boolean;
  error?: string;
  timestamp: string;
}

export interface SOSEventLog {
  id: string;
  event:
    | 'SOS_CREATED'
    | 'SOS_CANCELLED'
    | 'SOS_ACTIVATED'
    | 'SOS_NOTIFICATION_SENT'
    | 'SOS_NOTIFICATION_FAILED'
    | 'SOS_ACKNOWLEDGED'
    | 'SOS_ESCALATED'
    | 'SOS_RESOLVED'
    | 'LOCATION_UPDATED'
    | 'OFFLINE_QUEUED'
    | 'OFFLINE_SYNCED';
  timestamp: string;
  actorId?: string;
  actorName?: string;
  details?: Record<string, any>;
}

export interface SOSRecord {
  id: string;
  tripId: string;
  tripName?: string;
  userId: string;
  userName: string;
  userPhone: string;
  role: UserRole;
  latitude: number;
  longitude: number;
  accuracy: number;
  isLastKnownLocation?: boolean;
  lastKnownTimestamp?: string;
  deviceStatus?: {
    batteryLevel?: number;
    networkType?: string;
    isOnline: boolean;
  };
  status: SOSStatus;
  idempotencyKey?: string;
  escalatedAuthority?: AuthorityType;
  escalatedContactNumber?: string;
  cancellationWindowExpiresAt: string; // ISO timestamp
  createdAt: string;
  activatedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  acknowledgements: SOSAcknowledgement[];
  emergencyContactNotified: boolean;
  emergencyContactDetails?: {
    name: string;
    phone: string;
    email?: string;
    relationship: string;
    method: string;
    deliveryStatus: 'SENT' | 'QUEUED' | 'DELIVERED' | 'FAILED' | 'NO_CONTACT_CONFIGURED' | 'EMERGENCY_CONTACT_UNAVAILABLE' | 'REQUESTED' | 'PENDING' | 'SENDING';
    failureReason?: string;
    providerMessageId?: string;
    sentAt?: string;
    deliveredAt?: string;
  };
  recipientDeliveryStatus: SOSRecipientDelivery[];
  eventHistory: SOSEventLog[];
  communicationStatus?: {
    sosCreated: boolean;
    tripLeaderNotified: boolean;
    smsSubmitted: boolean;
    teamMembersNotified: boolean;
    smsFailureReason?: string;
  };
  smsAlertsSummary?: {
    tripLeaderSms: EmergencySmsNotification | null;
    emergencyContactSms: EmergencySmsNotification | null;
    teamMembersSms: EmergencySmsNotification[];
  };
  offlineSmsQueued?: boolean;
}

export interface EmergencySmsNotification {
  id: string;
  sosId: string;
  userId: string;
  tripId: string;
  recipientType: 'TRIP_LEADER' | 'TEAM_MEMBER' | 'EMERGENCY_CONTACT';
  recipientName: string;
  recipientPhone: string;
  channel: 'SMS';
  status: 'PENDING' | 'SENDING' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'EMERGENCY_CONTACT_UNAVAILABLE';
  provider: string;
  providerMessageId?: string;
  messageText: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  mapLink: string;
  idempotencyKey?: string;
  createdAt: string;
  attemptedAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
  failureReason?: string;
  attempts: number;
}

export interface AIDestinationSafetyGuide {
  destinationName: string;
  language: string;
  overallSafetyRating: 'HIGH' | 'MODERATE' | 'CAUTION' | 'UNKNOWN';
  safetySummary: string;
  verifiedAdvisories: string[];
  crimePrecautions: string[];
  roadConditions: string[];
  emergencyServicesInfo: {
    police: string;
    ambulance: string;
    touristHelpline: string;
  };
  communityExperience?: {
    totalReviews: number;
    avgSafetyScore: number;
    communitySentiment: string;
    observedExperiences: string[];
  };
  generatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  tripId?: string;
  type: 'SOS' | 'BOUNDARY_ALERT' | 'LEADERSHIP' | 'GENERAL';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface TripMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderPhotoURL?: string;
  senderRole: UserRole;
  messageText: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineMessage {
  id: string;
  type: 'BOUNDARY_ALERT' | 'SOS' | 'IM_SAFE' | 'NEED_HELP' | 'LEADERSHIP_MSG';
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  synced: boolean;
}

// ==========================================
// Trip Review & Experience Feature Types
// ==========================================

export type OverallRating = 1 | 2 | 3 | 4 | 5;
export type SafetyRating = 1 | 2 | 3 | 4 | 5;
export type RouteRating = 'Very Poor' | 'Poor' | 'Average' | 'Good' | 'Excellent';
export type RouteFeltSafe = 'Yes' | 'Partially' | 'No' | 'Not Applicable';
export type SafetyIssueType = 'No issues' | 'Minor issue' | 'Safety concern' | 'Emergency situation';

export interface TripReview {
  id: string;
  tripId: string;
  tripCode?: string;
  destination: string;
  userId: string;
  userName: string;
  userRole?: UserRole;
  overallRating: OverallRating; // 1-5 stars
  safetyRating: SafetyRating; // 1-5 point rating (1=Very Unsafe to 5=Very Safe)
  routeRating: RouteRating; // 'Very Poor' | 'Poor' | 'Average' | 'Good' | 'Excellent'
  routeFeltSafe: RouteFeltSafe; // 'Yes' | 'Partially' | 'No' | 'Not Applicable'
  destinationRating: number; // 1-5 stars
  destinationExperiences: string[]; // e.g. 'Safe environment', 'Heavy crowd', etc.
  safetyIssueType: SafetyIssueType; // 'No issues' | 'Minor issue' | 'Safety concern' | 'Emergency situation'
  safetyIssueDetails?: string; // Multiline text if safety issue occurred
  featureRatings: {
    aiSafetyGuide: number | null; // 1-5 or null if Not Used
    safeRouteRecommendation: number | null;
    smartSafeBubble: number | null;
    safetyAlerts: number | null;
    sosEmergencySupport: number | null;
    offlineSafetyFeatures: number | null;
  };
  suggestions?: string; // Optional suggestions / open feedback
  createdAt: string;
  updatedAt: string;
}

export interface DestinationReviewSummary {
  destination: string;
  totalReviews: number;
  averageOverallRating: number;
  averageSafetyRating: number;
  averageDestinationRating: number;
  safetyIssueCount: number;
  topExperiences: { tag: string; count: number }[];
  routeSafetyPercentage: number;
  recentReviews: {
    id: string;
    userName: string;
    overallRating: number;
    safetyRating: number;
    routeRating: string;
    destinationRating: number;
    destinationExperiences: string[];
    safetyIssueType: string;
    suggestions?: string;
    createdAt: string;
  }[];
}
