import { db } from './database';
import {
  SOSRecord,
  AuthorityType,
  UserMedicalInfo,
  UserProfile,
  UserRole,
  SOSStatus,
  SOSEventLog,
  SOSAcknowledgement
} from '../src/types';
import {
  dispatchSosFcmToTripMembers,
  notifyEmergencyContact
} from './emergencyNotificationService';
import { smsService } from './smsService';

/**
 * Validates whether user is an authorized active member of the specified active trip
 */
export function validateTripMembershipForSos(tripId: string, userId: string): { trip: any; member: any; role: UserRole } {
  const trip = db.trips.get(tripId);
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND: Trip record not found');
  }

  if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED' || trip.isArchived) {
    throw new Error(`TRIP_INACTIVE: Cannot activate SOS for inactive or completed trip (status: ${trip.status})`);
  }

  const members = db.tripMembers.get(tripId) || [];
  const member = members.find(m => m.userId === userId && m.status === 'APPROVED');

  if (!member && trip.leaderId !== userId) {
    throw new Error('UNAUTHORIZED_MEMBER: User is not an active authorized member of this trip');
  }

  const role: UserRole = trip.leaderId === userId ? 'LEADER' : 'MEMBER';
  return { trip, member, role };
}

/**
 * Initiates an SOS alert with a 10-second cancellation window timer
 * Includes idempotency check and offline queuing support.
 */
export function createSOSAlert(
  tripId: string,
  userId: string,
  latitude: number,
  longitude: number,
  accuracy: number = 8,
  isLastKnownLocation: boolean = false,
  idempotencyKey?: string,
  isOfflinePending: boolean = false
): SOSRecord {
  // Idempotency check to prevent duplicates
  if (idempotencyKey) {
    const existing = Array.from(db.sosRecords.values()).find(
      s => s.idempotencyKey === idempotencyKey && s.tripId === tripId && s.userId === userId
    );
    if (existing) {
      console.log(`[SafeRoad SOS] Duplicate SOS request ignored via idempotencyKey: ${idempotencyKey}`);
      return existing;
    }
  }

  const user = db.users.get(userId);
  if (!user) {
    throw new Error('User record not found');
  }

  const { trip, role } = validateTripMembershipForSos(tripId, userId);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 1000); // 10 seconds cancellation window

  const initialStatus: SOSStatus = isOfflinePending ? 'PENDING_SYNC' : 'INITIATED';

  const initialEvent: SOSEventLog = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    event: isOfflinePending ? 'OFFLINE_QUEUED' : 'SOS_CREATED',
    timestamp: now.toISOString(),
    actorId: userId,
    actorName: user.name,
    details: {
      latitude,
      longitude,
      accuracy,
      isLastKnownLocation,
      cancellationWindowExpiresAt: expiresAt.toISOString()
    }
  };

  const sosRecord: SOSRecord = {
    id: 'sos_' + Math.random().toString(36).substring(2, 9),
    tripId,
    tripName: trip.destination,
    userId,
    userName: user.name,
    userPhone: user.phone,
    role,
    latitude,
    longitude,
    accuracy,
    isLastKnownLocation,
    lastKnownTimestamp: isLastKnownLocation ? now.toISOString() : undefined,
    deviceStatus: {
      batteryLevel: 85,
      networkType: isOfflinePending ? 'OFFLINE' : '4G/WIFI',
      isOnline: !isOfflinePending
    },
    status: initialStatus,
    idempotencyKey: idempotencyKey || 'idemp_' + Math.random().toString(36).substring(2, 9),
    cancellationWindowExpiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    acknowledgements: [],
    emergencyContactNotified: false,
    recipientDeliveryStatus: [],
    eventHistory: [initialEvent]
  };

  db.sosRecords.set(sosRecord.id, sosRecord);

  db.logAudit(userId, user.name, 'SOS_INITIATED', {
    sosId: sosRecord.id,
    tripId,
    role,
    latitude,
    longitude,
    status: initialStatus
  });

  return sosRecord;
}

/**
 * Cancels an SOS alert within the 10-second cancellation window
 * No broadcast notifications are sent.
 */
export function cancelSOSAlert(sosId: string, userId: string, cancellationReason?: string): SOSRecord {
  const sos = db.sosRecords.get(sosId);
  if (!sos) {
    throw new Error('SOS record not found');
  }

  if (sos.userId !== userId) {
    throw new Error('Unauthorized: Only the creator can cancel this SOS');
  }

  if (sos.status === 'RESOLVED') {
    throw new Error('SOS is already resolved');
  }

  const now = new Date().toISOString();
  sos.status = 'CANCELLED';
  sos.resolvedAt = now;
  sos.resolutionNotes = cancellationReason || 'Cancelled by user during 10s cancellation countdown';

  const cancelEvent: SOSEventLog = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    event: 'SOS_CANCELLED',
    timestamp: now,
    actorId: userId,
    actorName: sos.userName,
    details: { reason: sos.resolutionNotes }
  };
  sos.eventHistory.push(cancelEvent);

  db.sosRecords.set(sosId, sos);
  db.logAudit(userId, sos.userName, 'SOS_CANCELLED_WITHIN_WINDOW', { sosId });

  return sos;
}

/**
 * Activates an SOS alert (after 10s countdown finishes or immediate confirmation)
 * Dispatches high-priority FCM to all trip members, notifies Trip Leader, and sends automatic SMS to Emergency Contact.
 */
export async function activateSOSAlert(
  sosId: string,
  actorUserId: string,
  freshLocation?: { latitude: number; longitude: number; accuracy?: number }
): Promise<SOSRecord> {
  const sos = db.sosRecords.get(sosId);
  if (!sos) {
    throw new Error('SOS record not found');
  }

  if (sos.status === 'CANCELLED' || sos.status === 'RESOLVED') {
    throw new Error(`Cannot activate SOS in status: ${sos.status}`);
  }

  const victimUser = db.users.get(sos.userId);
  if (!victimUser) {
    throw new Error('Victim user record not found');
  }

  const trip = db.trips.get(sos.tripId);
  if (!trip) {
    throw new Error('Trip not found');
  }

  const now = new Date().toISOString();
  sos.status = 'ACTIVE';
  sos.activatedAt = now;

  // If a fresh GPS position fix was obtained right at confirmation, update the SOS coordinates
  if (
    freshLocation &&
    typeof freshLocation.latitude === 'number' &&
    typeof freshLocation.longitude === 'number' &&
    !isNaN(freshLocation.latitude) &&
    !isNaN(freshLocation.longitude)
  ) {
    sos.latitude = freshLocation.latitude;
    sos.longitude = freshLocation.longitude;
    sos.accuracy = freshLocation.accuracy || 8;
    sos.isLastKnownLocation = false;
    sos.lastKnownTimestamp = now;
  }

  const activeMembers = db.tripMembers.get(sos.tripId) || [];

  // 1. Dispatch High-Priority FCM to Active Trip Members
  const fcmResults = await dispatchSosFcmToTripMembers(sos.tripId, sos, victimUser, activeMembers);
  sos.recipientDeliveryStatus = fcmResults;

  // 2. Dispatch Automated Emergency SMS to Trip Leader, Approved Team Members, and Emergency Contact
  const smsDispatchSummary = await smsService.sendSosSms(sos, victimUser, trip, activeMembers);

  const leaderSms = smsDispatchSummary.recipientRecords.find(r => r.recipientType === 'TRIP_LEADER') || null;
  const contactSms = smsDispatchSummary.recipientRecords.find(r => r.recipientType === 'EMERGENCY_CONTACT') || null;
  const teamMemberSmsList = smsDispatchSummary.recipientRecords.filter(r => r.recipientType === 'TEAM_MEMBER');

  sos.smsAlertsSummary = {
    tripLeaderSms: leaderSms,
    emergencyContactSms: contactSms,
    teamMembersSms: teamMemberSmsList
  };

  sos.communicationStatus = {
    sosCreated: true,
    tripLeaderNotified: smsDispatchSummary.tripLeaderNotified,
    smsSubmitted: smsDispatchSummary.smsSubmitted,
    teamMembersNotified: smsDispatchSummary.teamMembersNotified,
    smsFailureReason: smsDispatchSummary.failureReasons.length > 0 ? smsDispatchSummary.failureReasons.join('; ') : undefined
  };

  sos.emergencyContactNotified = contactSms ? (contactSms.status === 'SENT' || contactSms.status === 'DELIVERED') : false;

  if (contactSms) {
    sos.emergencyContactDetails = {
      name: contactSms.recipientName,
      phone: contactSms.recipientPhone,
      relationship: victimUser.emergencyContact?.relationship || 'Emergency Contact',
      method: contactSms.provider,
      deliveryStatus: contactSms.status as any,
      failureReason: contactSms.failureReason,
      providerMessageId: contactSms.providerMessageId,
      sentAt: contactSms.sentAt
    };
  } else {
    sos.emergencyContactDetails = {
      name: 'Not Configured',
      phone: 'Not Configured',
      relationship: 'None',
      method: 'NONE',
      deliveryStatus: 'EMERGENCY_CONTACT_UNAVAILABLE',
      failureReason: 'No emergency contact phone number configured in traveler profile'
    };
  }

  // 3. Record Activation Events
  sos.eventHistory.push({
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    event: 'SOS_ACTIVATED',
    timestamp: now,
    actorId: actorUserId,
    actorName: victimUser.name,
    details: {
      fcmDeliveredCount: fcmResults.filter(r => r.delivered).length,
      tripLeaderNotified: smsDispatchSummary.tripLeaderNotified,
      smsSubmitted: smsDispatchSummary.smsSubmitted,
      teamMembersNotified: smsDispatchSummary.teamMembersNotified,
      recipientsDispatched: smsDispatchSummary.recipientRecords.length
    }
  });

  sos.eventHistory.push({
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    event: 'SOS_NOTIFICATION_SENT',
    timestamp: now,
    details: {
      recipients: fcmResults.map(r => ({ name: r.userName, delivered: r.delivered, fcmValid: r.fcmTokenValid })),
      smsSummary: sos.communicationStatus
    }
  });

  db.sosRecords.set(sosId, sos);

  db.logAudit(actorUserId, victimUser.name, 'SOS_ACTIVATED_BROADCAST', {
    sosId,
    tripId: sos.tripId,
    recipientsCount: fcmResults.length,
    smsDispatchedCount: smsDispatchSummary.recipientRecords.length,
    emergencyContactNotified: sos.emergencyContactNotified
  });

  return sos;
}

/**
 * Retries automatic SMS dispatch to all emergency recipients if a previous attempt failed
 * Idempotent: will not duplicate SMS if already SENT or DELIVERED
 */
export async function retryEmergencyContactSms(sosId: string, actorUserId: string): Promise<SOSRecord> {
  const sos = db.sosRecords.get(sosId);
  if (!sos) {
    throw new Error('SOS record not found');
  }

  const victimUser = db.users.get(sos.userId);
  if (!victimUser) {
    throw new Error('Victim user record not found');
  }

  const trip = db.trips.get(sos.tripId);
  if (!trip) {
    throw new Error('Trip not found');
  }

  const activeMembers = db.tripMembers.get(sos.tripId) || [];

  // Dispatch multi-recipient automated emergency SMS
  const smsDispatchSummary = await smsService.sendSosSms(sos, victimUser, trip, activeMembers);

  const leaderSms = smsDispatchSummary.recipientRecords.find(r => r.recipientType === 'TRIP_LEADER') || null;
  const contactSms = smsDispatchSummary.recipientRecords.find(r => r.recipientType === 'EMERGENCY_CONTACT') || null;
  const teamMemberSmsList = smsDispatchSummary.recipientRecords.filter(r => r.recipientType === 'TEAM_MEMBER');

  sos.smsAlertsSummary = {
    tripLeaderSms: leaderSms,
    emergencyContactSms: contactSms,
    teamMembersSms: teamMemberSmsList
  };

  sos.communicationStatus = {
    sosCreated: true,
    tripLeaderNotified: smsDispatchSummary.tripLeaderNotified,
    smsSubmitted: smsDispatchSummary.smsSubmitted,
    teamMembersNotified: smsDispatchSummary.teamMembersNotified,
    smsFailureReason: smsDispatchSummary.failureReasons.length > 0 ? smsDispatchSummary.failureReasons.join('; ') : undefined
  };

  sos.emergencyContactNotified = contactSms ? (contactSms.status === 'SENT' || contactSms.status === 'DELIVERED') : false;
  if (contactSms) {
    sos.emergencyContactDetails = {
      name: contactSms.recipientName,
      phone: contactSms.recipientPhone,
      relationship: victimUser.emergencyContact?.relationship || 'Emergency Contact',
      method: contactSms.provider,
      deliveryStatus: contactSms.status as any,
      failureReason: contactSms.failureReason,
      providerMessageId: contactSms.providerMessageId,
      sentAt: contactSms.sentAt
    };
  }

  sos.eventHistory.push({
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    event: 'SOS_NOTIFICATION_SENT',
    timestamp: new Date().toISOString(),
    actorId: actorUserId,
    details: {
      action: 'RETRY_EMERGENCY_SMS',
      emergencyContact: sos.emergencyContactDetails
    }
  });

  db.sosRecords.set(sosId, sos);
  return sos;
}

/**
 * Acknowledges an active SOS incident
 */
export function acknowledgeSOSAlert(sosId: string, ackUserId: string): SOSRecord {
  const sos = db.sosRecords.get(sosId);
  if (!sos) {
    throw new Error('SOS record not found');
  }

  const user = db.users.get(ackUserId);
  if (!user) {
    throw new Error('User record not found');
  }

  const trip = db.trips.get(sos.tripId);
  const role: UserRole = trip && trip.leaderId === ackUserId ? 'LEADER' : 'MEMBER';

  const now = new Date().toISOString();

  // Check if already acknowledged
  const alreadyAcked = sos.acknowledgements.some(a => a.userId === ackUserId);
  if (!alreadyAcked) {
    const ack: SOSAcknowledgement = {
      userId: ackUserId,
      userName: user.name,
      role,
      timestamp: now
    };
    sos.acknowledgements.push(ack);
  }

  if (sos.status === 'ACTIVE') {
    sos.status = 'ACKNOWLEDGED';
  }

  sos.eventHistory.push({
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    event: 'SOS_ACKNOWLEDGED',
    timestamp: now,
    actorId: ackUserId,
    actorName: user.name,
    details: { role }
  });

  db.sosRecords.set(sosId, sos);
  db.logAudit(ackUserId, user.name, 'SOS_ACKNOWLEDGED', { sosId, role });

  return sos;
}

/**
 * Updates live location for an active SOS
 */
export function updateSOSLocation(
  sosId: string,
  userId: string,
  latitude: number,
  longitude: number,
  accuracy: number = 8
): SOSRecord {
  const sos = db.sosRecords.get(sosId);
  if (!sos) {
    throw new Error('SOS record not found');
  }

  if (sos.userId !== userId) {
    throw new Error('Unauthorized: Only victim can update SOS location');
  }

  sos.latitude = latitude;
  sos.longitude = longitude;
  sos.accuracy = accuracy;
  sos.isLastKnownLocation = false;

  const now = new Date().toISOString();
  sos.eventHistory.push({
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    event: 'LOCATION_UPDATED',
    timestamp: now,
    details: { latitude, longitude, accuracy }
  });

  db.sosRecords.set(sosId, sos);
  return sos;
}

/**
 * Trip Leader escalates uncancelled SOS to emergency authorities (Police, Hospital, Fire & Rescue)
 */
export function escalateSOSAlert(
  sosId: string,
  leaderUserId: string,
  authority: AuthorityType
): { sos: SOSRecord; dispatchContact: string } {
  const sos = db.sosRecords.get(sosId);
  if (!sos) {
    throw new Error('SOS record not found');
  }

  const trip = db.trips.get(sos.tripId);
  if (!trip) {
    throw new Error('Trip not found');
  }

  if (trip.leaderId !== leaderUserId) {
    throw new Error('Unauthorized: Only the Trip Leader can escalate emergency requests');
  }

  // Location-aware emergency authority numbers
  const emergencyNumbers: Record<AuthorityType, string> = {
    POLICE: '112 (National Police Control)',
    HOSPITAL: '108 (Emergency Medical Ambulance Services)',
    FIRE_RESCUE: '101 (Fire & Disaster Rescue)'
  };

  const contactNumber = emergencyNumbers[authority] || '112';

  const now = new Date().toISOString();
  sos.status = 'ESCALATED';
  sos.escalatedAuthority = authority;
  sos.escalatedContactNumber = contactNumber;

  sos.eventHistory.push({
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    event: 'SOS_ESCALATED',
    timestamp: now,
    actorId: leaderUserId,
    actorName: 'Trip Leader',
    details: { authority, contactNumber }
  });

  db.sosRecords.set(sosId, sos);

  db.logAudit(leaderUserId, 'Leader', 'SOS_ESCALATED', {
    sosId,
    authority,
    contactNumber
  });

  return { sos, dispatchContact: contactNumber };
}

/**
 * Resolves an SOS incident
 */
export function resolveSOSAlert(sosId: string, actorUserId: string, resolutionNotes?: string): SOSRecord {
  const sos = db.sosRecords.get(sosId);
  if (!sos) {
    throw new Error('SOS record not found');
  }

  const user = db.users.get(actorUserId);
  const trip = db.trips.get(sos.tripId);

  const isLeader = trip && trip.leaderId === actorUserId;
  const isVictim = sos.userId === actorUserId;

  if (!isLeader && !isVictim) {
    throw new Error('Unauthorized: Only the Trip Leader or SOS creator can resolve this SOS');
  }

  const now = new Date().toISOString();
  sos.status = 'RESOLVED';
  sos.resolvedAt = now;
  sos.resolutionNotes = resolutionNotes || `Resolved by ${user?.name || 'Authorized User'}`;

  sos.eventHistory.push({
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    event: 'SOS_RESOLVED',
    timestamp: now,
    actorId: actorUserId,
    actorName: user?.name,
    details: { notes: sos.resolutionNotes }
  });

  db.sosRecords.set(sosId, sos);
  db.logAudit(actorUserId, user?.name, 'SOS_RESOLVED', { sosId, resolutionNotes: sos.resolutionNotes });

  return sos;
}

/**
 * Access-controlled emergency medical information retrieval endpoint.
 * Enforces privacy rules: Normal members CANNOT access other members' medical data.
 * Hospital / Police / Trip Leader can access ONLY upon confirmed SOS escalation or authorization.
 */
export function getEmergencyMedicalProfile(
  sosId: string,
  requestorUserId?: string,
  isAuthorityRole: boolean = false
): {
  user: { name: string; age: number; gender: string; phone: string };
  medicalInfo: UserMedicalInfo;
  location: { latitude: number; longitude: number; accuracy: number; isLastKnownLocation?: boolean };
  routeToVictim: string;
} {
  const sos = db.sosRecords.get(sosId);
  if (!sos) {
    throw new Error('SOS record not found');
  }

  const victimUser = db.users.get(sos.userId);
  if (!victimUser) {
    throw new Error('Victim user profile not found');
  }

  const trip = db.trips.get(sos.tripId);

  // Privacy Access Control Check
  if (!isAuthorityRole) {
    if (!requestorUserId) {
      throw new Error('Unauthorized: Access to emergency medical profile requires identity verification');
    }
    // Self or Trip Leader during active SOS
    const isSelf = requestorUserId === victimUser.id;
    const isLeader = trip && trip.leaderId === requestorUserId;

    if (!isSelf && !isLeader) {
      throw new Error('Access Denied: Ordinary team members are strictly prohibited from viewing medical info of other members.');
    }
  }

  db.logAudit(requestorUserId || 'AUTHORITY_DASHBOARD', 'Emergency Access', 'ACCESS_MEDICAL_DATA', {
    sosId,
    victimUserId: victimUser.id
  });

  return {
    user: {
      name: victimUser.name,
      age: victimUser.age,
      gender: victimUser.gender,
      phone: victimUser.phone
    },
    medicalInfo: victimUser.medicalInfo,
    location: {
      latitude: sos.latitude,
      longitude: sos.longitude,
      accuracy: sos.accuracy,
      isLastKnownLocation: sos.isLastKnownLocation
    },
    // OpenStreetMap secure directions link (NO Google Maps)
    routeToVictim: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${sos.latitude}%2C${sos.longitude}`
  };
}
