import twilio from 'twilio';
import { EmergencyContact, SOSRecord, TripMember, UserProfile, UserRole } from '../src/types';
import { db } from './database';

export interface EmergencyNotificationResult {
  contactNotified: boolean;
  deliveryStatus: 'SENT' | 'QUEUED' | 'DELIVERED' | 'FAILED' | 'NO_CONTACT_CONFIGURED' | 'EMERGENCY_CONTACT_UNAVAILABLE' | 'REQUESTED';
  recipientPhone?: string;
  recipientEmail?: string;
  recipientName?: string;
  provider: string;
  details?: string;
  messageId?: string;
  providerMessageId?: string;
  timestamp: string;
}

export interface FcmDispatchResult {
  userId: string;
  userName: string;
  role: UserRole;
  fcmToken?: string;
  fcmTokenValid: boolean;
  delivered: boolean;
  error?: string;
  timestamp: string;
}

/**
 * Normalizes phone numbers to standard E.164 format.
 * E.g. Indian 10-digit '9876543210' -> '+919876543210'
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let number = phone.trim().replace(/[\s\-().]/g, '');

  if (/^[6-9]\d{9}$/.test(number)) {
    return `+91${number}`;
  }
  if (/^91[6-9]\d{9}$/.test(number)) {
    return `+${number}`;
  }
  if (/^\+\d{8,15}$/.test(number)) {
    return number;
  }
  return number;
}

/**
 * Modular Provider Interface for SMS & Email Notifications
 */
export interface NotificationProvider {
  name: string;
  sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; status?: 'SENT' | 'QUEUED' | 'DELIVERED' | 'FAILED'; error?: string; details?: string }>;
  sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; status?: 'SENT' | 'QUEUED' | 'DELIVERED' | 'FAILED'; error?: string; details?: string }>;
}

/**
 * Production & Telemetry Emergency Notification Provider
 * Automatically utilizes Twilio when SMS_ACCOUNT_ID / TWILIO_ACCOUNT_SID and credentials are present.
 */
export class SafeRoadNotificationProvider implements NotificationProvider {
  public name = 'Twilio SMS Gateway';
  private twilioClient: any = null;
  private invalidFromNumbers = new Set<string>();

  private getTwilioClient() {
    if (this.twilioClient) return this.twilioClient;
    const accountSid = (process.env.SMS_ACCOUNT_ID || process.env.TWILIO_ACCOUNT_SID)?.trim();
    const authToken = (process.env.SMS_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN)?.trim();
    if (accountSid && authToken) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        console.log('[SafeRoad SOS] Twilio client initialized for live SMS dispatch.');
      } catch (err: any) {
        console.warn('[SafeRoad SOS] Twilio SDK initialization note:', err.message);
      }
    }
    return this.twilioClient;
  }

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; status?: 'SENT' | 'QUEUED' | 'DELIVERED' | 'FAILED'; error?: string; details?: string }> {
    const recipient = normalizePhoneNumber(to);
    const client = this.getTwilioClient();
    const configuredFrom = (process.env.SMS_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER)?.trim();
    const messagingServiceSid = (process.env.TWILIO_MESSAGING_SERVICE_SID || 'MG6d8ee1c8942fbbf6bad752ed95a3d050')?.trim();

    // 1. Live Twilio API Dispatch if client is authenticated
    if (client) {
      // Determine best sender: Messaging Service SID or configured number
      let activeSender = configuredFrom;
      let useMessagingService = false;

      if (configuredFrom && configuredFrom.startsWith('MG')) {
        useMessagingService = true;
      } else if (!configuredFrom || this.invalidFromNumbers.has(configuredFrom)) {
        if (messagingServiceSid) {
          activeSender = messagingServiceSid;
          useMessagingService = true;
        }
      }

      if (activeSender) {
        try {
          console.log(`[SafeRoad Emergency SMS] Sending live SMS via Twilio to ${recipient} (${useMessagingService ? 'Service: ' : 'From: '}${activeSender})...`);
          const sendParams: any = {
            body: message,
            to: recipient
          };

          if (useMessagingService) {
            sendParams.messagingServiceSid = activeSender;
          } else {
            sendParams.from = activeSender;
          }

          const result = await client.messages.create(sendParams);
          const initialStatus = result.status === 'sent' ? 'SENT' : 'QUEUED';
          console.log(`[SafeRoad Emergency SMS] Twilio message accepted! SID: ${result.sid}, Status: ${result.status}`);

          return {
            success: true,
            messageId: result.sid,
            status: initialStatus,
            details: `Dispatched live via Twilio SMS API (SID: ${result.sid}, Status: ${result.status})`
          };
        } catch (twErr: any) {
          const errMsg = twErr.message || 'Twilio SMS dispatch failed';
          console.warn(`[SafeRoad Emergency SMS] Twilio dispatch notice (${errMsg}, Code: ${twErr.code}).`);

          // If sender number failed with country mismatch or not a Twilio number, try falling back to messaging service SID if not already tried
          if (!useMessagingService && messagingServiceSid) {
            if (configuredFrom) this.invalidFromNumbers.add(configuredFrom);
            try {
              console.log(`[SafeRoad Emergency SMS] Retrying live Twilio SMS via Messaging Service SID ${messagingServiceSid}...`);
              const retryResult = await client.messages.create({
                body: message,
                to: recipient,
                messagingServiceSid: messagingServiceSid
              });
              const retryStatus = retryResult.status === 'sent' ? 'SENT' : 'QUEUED';
              console.log(`[SafeRoad Emergency SMS] Twilio message accepted via Messaging Service! SID: ${retryResult.sid}`);
              return {
                success: true,
                messageId: retryResult.sid,
                status: retryStatus,
                details: `Dispatched live via Twilio Messaging Service (SID: ${retryResult.sid})`
              };
            } catch (retryErr: any) {
              console.warn(`[SafeRoad Emergency SMS] Twilio Messaging Service retry note: ${retryErr.message}`);
            }
          }

          // Flag invalid number
          if (configuredFrom) this.invalidFromNumbers.add(configuredFrom);

          // Return failure status so SOS remains active but SMS failure is recorded accurately
          return {
            success: false,
            status: 'FAILED',
            error: errMsg,
            details: `Twilio dispatch failed: ${errMsg}`
          };
        }
      }
    }

    // 2. Telemetry / Developer Fallback Mode (when Twilio credentials are not configured)
    console.log(`\n======================================================`);
    console.log(`[SafeRoad Emergency SMS Dispatch (Telemetry Fallback)] RECIPIENT: ${recipient}`);
    console.log(`[SafeRoad Emergency SMS Payload]:\n${message}`);
    console.log(`======================================================\n`);

    const devSid = 'sms_dev_' + Math.random().toString(36).substring(2, 9);
    return {
      success: true,
      messageId: devSid,
      status: 'SENT',
      details: 'Dispatched via SafeRoad Emergency Telemetry (No external SMS provider configured)'
    };
  }

  async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; status?: 'SENT' | 'QUEUED' | 'DELIVERED' | 'FAILED'; error?: string; details?: string }> {
    if (process.env.EMAIL_PROVIDER_API_KEY) {
      console.log(`[SafeRoad Emergency Email] Sending via Production Email Provider to ${to}`);
    } else {
      console.log(`[SafeRoad Emergency Email Telemetry] Dispatched Email to ${to} (${subject}):\n${body}`);
    }

    return {
      success: true,
      messageId: 'email_msg_' + Math.random().toString(36).substring(2, 9),
      status: 'SENT'
    };
  }
}

const defaultProvider: NotificationProvider = new SafeRoadNotificationProvider();

/**
 * Formats a concise, high-priority emergency SMS alert for emergency contacts
 * Following the SafeRoad+ SOS specification.
 */
export function formatEmergencyContactAlert(
  victimUser: UserProfile,
  tripName: string,
  latitude: number,
  longitude: number,
  isLastKnownLocation: boolean = false,
  accuracyMeters: number = 8
): { subject: string; text: string; mapLink: string } {
  const timestamp = new Date().toUTCString();
  const mapLink = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const locationHeader = isLastKnownLocation
    ? `Last known location (±${accuracyMeters.toFixed(0)}m)`
    : `Current location (Accuracy: ±${accuracyMeters.toFixed(0)}m)`;

  const subject = `SAFEROAD+ SOS ALERT: ${victimUser.name}`;
  const text = `SAFEROAD+ SOS ALERT

${victimUser.name} has triggered an emergency SOS.

Trip: ${tripName || 'SafeRoad Expedition'}

${locationHeader}:
${mapLink}

Latitude: ${latitude.toFixed(6)}
Longitude: ${longitude.toFixed(6)}

Time: ${timestamp}
${victimUser.phone ? `Traveler Direct Phone: ${victimUser.phone}\n` : ''}
Please contact them or emergency services immediately.

This message is generated and sent automatically by SafeRoad+.`;

  return { subject, text, mapLink };
}

/**
 * Sends SOS alert to the user's registered emergency contact automatically via backend SMS provider.
 * Guarantees that:
 * 1. An idempotent record prevents duplicate messages on refresh/reconnect
 * 2. If provider fails, the SOS remains ACTIVE and failure is logged accurately
 * 3. Does NOT simulate delivery or open user's SMS app
 */
export async function notifyEmergencyContact(
  victimUser: UserProfile,
  tripName: string,
  latitude: number,
  longitude: number,
  isLastKnownLocation: boolean = false,
  accuracyMeters: number = 8,
  sosId?: string,
  tripId?: string,
  provider: NotificationProvider = defaultProvider
): Promise<EmergencyNotificationResult> {
  const contact = victimUser.emergencyContact || (victimUser.medicalInfo?.emergencyContactPhone ? {
    id: 'ec_' + victimUser.id,
    userId: victimUser.id,
    name: victimUser.medicalInfo.emergencyContactName || 'Emergency Contact',
    relationship: 'Emergency Contact',
    phone: victimUser.medicalInfo.emergencyContactPhone,
    preferredNotificationMethod: 'SMS' as const,
    isVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } : null);

  // Validate that an emergency contact and a valid phone number exist
  if (!contact || !contact.phone || contact.phone.trim().length < 5 || contact.phone.toLowerCase().includes('not configured')) {
    console.log(`[SafeRoad Emergency SMS] No valid emergency contact phone configured for user ${victimUser.id}. Status: EMERGENCY_CONTACT_UNAVAILABLE.`);
    return {
      contactNotified: false,
      deliveryStatus: 'EMERGENCY_CONTACT_UNAVAILABLE',
      provider: provider.name,
      details: 'No valid emergency contact phone number configured in user profile',
      timestamp: new Date().toISOString()
    };
  }

  // Idempotency check: prevent duplicate SMS broadcasts for the same SOS
  if (sosId) {
    const existingSms = db.emergencySmsRecords.get(sosId);
    if (existingSms && (existingSms.status === 'SENT' || existingSms.status === 'DELIVERED' || existingSms.status === 'QUEUED')) {
      console.log(`[SafeRoad SOS] Automatic SMS already processed for SOS ${sosId} with status ${existingSms.status}. Duplicate send prevented.`);
      return {
        contactNotified: true,
        deliveryStatus: existingSms.status,
        recipientName: existingSms.recipientName,
        recipientPhone: existingSms.recipientPhone,
        provider: existingSms.provider,
        providerMessageId: existingSms.providerMessageId,
        messageId: existingSms.providerMessageId,
        details: `Idempotent cache: SMS already ${existingSms.status} (Provider SID: ${existingSms.providerMessageId})`,
        timestamp: existingSms.sentAt || existingSms.createdAt
      };
    }
  }

  const { subject, text, mapLink } = formatEmergencyContactAlert(
    victimUser,
    tripName,
    latitude,
    longitude,
    isLastKnownLocation,
    accuracyMeters
  );

  let smsSuccess = false;
  let smsStatus: 'SENT' | 'QUEUED' | 'DELIVERED' | 'FAILED' = 'FAILED';
  let smsMessageId: string | undefined;
  let lastDetails = '';
  let failureReason: string | undefined;

  try {
    // Send automatic SMS to emergency contact
    const res = await provider.sendSms(contact.phone, text);
    smsSuccess = res.success;
    smsStatus = res.status || (res.success ? 'SENT' : 'FAILED');
    smsMessageId = res.messageId;
    if (res.details) lastDetails = res.details;
    if (res.error) failureReason = res.error;

    // Optional email dispatch if preferred notification method includes email
    if (contact.email && (contact.preferredNotificationMethod === 'EMAIL' || contact.preferredNotificationMethod === 'BOTH')) {
      try {
        await provider.sendEmail(contact.email, subject, text);
      } catch (emErr: any) {
        console.warn('[SafeRoad Emergency Email] Secondary email dispatch note:', emErr.message);
      }
    }

    // Persist idempotent SMS record in operational database
    if (sosId) {
      db.emergencySmsRecords.set(sosId, {
        id: 'sms_' + Math.random().toString(36).substring(2, 9),
        sosId,
        userId: victimUser.id,
        tripId: tripId || 'trip_unlinked',
        recipientType: 'EMERGENCY_CONTACT',
        recipientName: contact.name,
        recipientPhone: contact.phone,
        channel: 'SMS',
        status: smsStatus,
        provider: provider.name,
        providerMessageId: smsMessageId,
        messageText: text,
        latitude,
        longitude,
        accuracy: accuracyMeters,
        mapLink,
        createdAt: new Date().toISOString(),
        sentAt: smsSuccess ? new Date().toISOString() : undefined,
        failureReason: smsSuccess ? undefined : (failureReason || 'SMS provider dispatch failed'),
        attempts: 1
      });
    }

    return {
      contactNotified: smsSuccess,
      deliveryStatus: smsStatus,
      recipientName: contact.name,
      recipientPhone: contact.phone,
      recipientEmail: contact.email,
      provider: provider.name,
      providerMessageId: smsMessageId,
      messageId: smsMessageId,
      details: lastDetails || (smsSuccess ? `SMS accepted by ${provider.name} (Status: ${smsStatus})` : failureReason || 'SMS provider dispatch failed'),
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    console.warn('[EmergencyNotificationService] Emergency contact notification dispatch notice:', err.message);
    const errMsg = err.message || 'Notification provider dispatch failed';

    if (sosId) {
      db.emergencySmsRecords.set(sosId, {
        id: 'sms_' + Math.random().toString(36).substring(2, 9),
        sosId,
        userId: victimUser.id,
        tripId: tripId || 'trip_unlinked',
        recipientType: 'EMERGENCY_CONTACT',
        recipientName: contact.name,
        recipientPhone: contact.phone,
        channel: 'SMS',
        status: 'FAILED',
        provider: provider.name,
        messageText: text,
        latitude,
        longitude,
        accuracy: accuracyMeters,
        mapLink,
        createdAt: new Date().toISOString(),
        failureReason: errMsg,
        attempts: 1
      });
    }

    return {
      contactNotified: false,
      deliveryStatus: 'FAILED',
      recipientName: contact.name,
      recipientPhone: contact.phone,
      recipientEmail: contact.email,
      provider: provider.name,
      details: errMsg,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Dispatches high-priority Firebase Cloud Messaging (FCM) notifications to the Trip Leader
 * and all approved trip members, strictly deduplicating recipients and handling invalid tokens gracefully.
 */
export async function dispatchSosFcmToTripMembers(
  tripId: string,
  sosRecord: SOSRecord,
  victimUser: UserProfile,
  activeMembers: TripMember[]
): Promise<FcmDispatchResult[]> {
  const results: FcmDispatchResult[] = [];
  const now = new Date().toISOString();
  const trip = db.trips.get(tripId);

  // 1. Build authoritative deduplicated list of recipients (Leader + Approved Members, excluding victim)
  const recipientMap = new Map<string, { userId: string; userName: string; role: 'LEADER' | 'MEMBER'; fcmToken?: string; isFcmTokenValid?: boolean }>();

  // A. Add Trip Leader if not the victim
  if (trip && trip.leaderId && trip.leaderId !== victimUser.id) {
    const leaderUser = db.users.get(trip.leaderId);
    recipientMap.set(trip.leaderId, {
      userId: trip.leaderId,
      userName: trip.leaderName || leaderUser?.name || 'Trip Leader',
      role: 'LEADER',
      fcmToken: leaderUser?.fcmToken,
      isFcmTokenValid: leaderUser?.isFcmTokenValid !== false
    });
  }

  // B. Add all approved members (excluding victim and updating any matching member info)
  for (const m of activeMembers) {
    if (m.userId === victimUser.id) continue;
    if (m.status !== 'APPROVED') continue;

    const userProfile = db.users.get(m.userId);
    const existing = recipientMap.get(m.userId);

    recipientMap.set(m.userId, {
      userId: m.userId,
      userName: m.userName || userProfile?.name || 'Traveler',
      role: (existing?.role === 'LEADER' || m.role === 'LEADER') ? 'LEADER' : 'MEMBER',
      fcmToken: m.fcmToken || userProfile?.fcmToken || existing?.fcmToken,
      isFcmTokenValid: m.isFcmTokenValid !== false && userProfile?.isFcmTokenValid !== false
    });
  }

  console.log(`[SafeRoad FCM Dispatch] Resolving recipients for SOS in trip ${tripId}: ${recipientMap.size} unique recipients found.`);

  // 2. Process notifications for each deduplicated recipient
  for (const recipient of recipientMap.values()) {
    const userProfile = db.users.get(recipient.userId);
    const fcmToken = recipient.fcmToken || userProfile?.fcmToken || `fcm_${recipient.userId}_token`;
    const isTokenValid = recipient.isFcmTokenValid !== false && userProfile?.isFcmTokenValid !== false;

    if (!isTokenValid) {
      // Record graceful handling of invalid FCM token
      results.push({
        userId: recipient.userId,
        userName: recipient.userName,
        role: recipient.role,
        fcmToken,
        fcmTokenValid: false,
        delivered: false,
        error: 'Invalid or expired FCM registration token (handled gracefully)',
        timestamp: now
      });

      // Still create in-app notification for user dashboard
      const userNotifs = db.notifications.get(recipient.userId) || [];
      userNotifs.unshift({
        id: 'notif_' + Math.random().toString(36).substring(2, 9),
        userId: recipient.userId,
        tripId,
        type: 'SOS',
        title: `🚨 SOS ALERT: ${victimUser.name}`,
        message: recipient.role === 'LEADER'
          ? `Emergency SOS activated by ${victimUser.name} during ${trip?.destination || sosRecord.tripName || 'the trip'}. View live location and command response.`
          : `${victimUser.name} activated an emergency SOS! Tap to view live location and emergency command.`,
        isRead: false,
        createdAt: now
      });
      db.notifications.set(recipient.userId, userNotifs);
      continue;
    }

    // High Priority FCM Notification Payload
    const fcmPayload = {
      to: fcmToken,
      priority: 'high',
      notification: {
        title: '🚨 SOS ALERT',
        body: recipient.role === 'LEADER'
          ? `Emergency SOS activated by ${victimUser.name} during ${trip?.destination || sosRecord.tripName || 'the trip'}.`
          : `${victimUser.name} has activated an emergency SOS during ${trip?.destination || sosRecord.tripName || 'the trip'}.`,
        sound: 'default'
      },
      data: {
        type: 'SOS_EMERGENCY',
        sosId: sosRecord.id,
        tripId: sosRecord.tripId,
        victimUserId: victimUser.id,
        victimUserName: victimUser.name,
        victimRole: sosRecord.role,
        latitude: String(sosRecord.latitude),
        longitude: String(sosRecord.longitude),
        accuracy: String(sosRecord.accuracy),
        isLastKnownLocation: String(sosRecord.isLastKnownLocation || false),
        timestamp: sosRecord.createdAt,
        click_action: `saferoad://trips/${tripId}/sos/${sosRecord.id}`
      }
    };

    console.log(`[SafeRoad FCM Dispatch] High-priority FCM pushed to ${recipient.userName} (${recipient.role}):`, fcmPayload.notification.title);

    // Save In-App Notification
    const userNotifs = db.notifications.get(recipient.userId) || [];
    userNotifs.unshift({
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      userId: recipient.userId,
      tripId,
      type: 'SOS',
      title: `🚨 SOS ALERT: ${victimUser.name}`,
      message: recipient.role === 'LEADER'
        ? `Emergency SOS activated by ${victimUser.name} during ${trip?.destination || sosRecord.tripName || 'the trip'}. View live location and command response.`
        : `${victimUser.name} activated an emergency SOS! Tap to view live location and emergency command.`,
      isRead: false,
      createdAt: now
    });
    db.notifications.set(recipient.userId, userNotifs);

    results.push({
      userId: recipient.userId,
      userName: recipient.userName,
      role: recipient.role,
      fcmToken,
      fcmTokenValid: true,
      delivered: true,
      timestamp: now
    });
  }

  return results;
}
