import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/database';
import { authenticateFirebaseToken, AuthenticatedRequest } from './server/firebaseAuth';
import { locationWebSocketService } from './server/locationWebSocketService';
import { searchAndVerifyHotels } from './server/placesService';
import { generateDestinationSafetyGuide, evaluateRouteSafety, getAIHotelRecommendations } from './server/geminiService';
import {
  calculateHaversineDistanceMeters,
  evaluateDynamicSafeBubble,
  getLeaderLocationStatus,
  createGeoJsonCircle
} from './server/geofenceService';
import { GEOFENCE_CONFIG } from './src/config/geofenceConfig';
import {
  createSOSAlert,
  cancelSOSAlert,
  activateSOSAlert,
  retryEmergencyContactSms,
  acknowledgeSOSAlert,
  updateSOSLocation,
  escalateSOSAlert,
  resolveSOSAlert,
  getEmergencyMedicalProfile
} from './server/sosService';
import { notifyEmergencyContact } from './server/emergencyNotificationService';
import {
  Trip,
  TripMember,
  AuthorityType,
  TripState,
  TripMessage,
  LeaderLocationStatus,
  EmergencyContact,
  SOSRecord,
  TripReview,
  DestinationReviewSummary
} from './src/types';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Initialize Real-time Multi-User WebSocket Location Service
  locationWebSocketService.initialize(server);

  app.use(cors());
  app.use(express.json({ strict: false, limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Gracefully handle malformed or non-standard JSON payloads
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
      console.warn(`[SafeRoad+ BodyParser] Intercepted malformed JSON body: ${err.message}`);
      return res.status(400).json({
        error: 'INVALID_JSON_BODY',
        message: 'The request body could not be parsed as valid JSON. Please ensure request payloads are JSON objects.'
      });
    }
    next(err);
  });

  // ==========================================
  // 1. HEALTH & AUDIT API
  // ==========================================
  app.get('/api/v1/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'SafeRoad+ Backend Services',
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // 2. AUTHENTICATION & PROFILE API
  // ==========================================
  app.post('/api/v1/auth/verify-token', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing idToken in request body' });
    }

    try {
      let user = Array.from(db.users.values()).find(u => u.firebaseUid === idToken || u.id === idToken);
      if (!user) {
        const newUserId = 'usr_' + Math.random().toString(36).substring(2, 9);
        user = {
          id: newUserId,
          firebaseUid: idToken,
          email: `traveler_${newUserId.substring(4)}@saferoad.org`,
          phone: '',
          name: 'Verified Traveler',
          age: 27,
          gender: 'Not Specified',
          preferredLanguage: 'en',
          medicalInfo: {
            emergencyContactName: '',
            emergencyContactPhone: '',
            bloodGroup: 'Not Specified',
            medicalConditions: 'None reported',
            allergies: 'None reported'
          }
        };
        db.users.set(user.id, user);
        db.firebaseUidToUserId.set(user.firebaseUid, user.id);
      }

      res.json({ user, token: idToken });
    } catch (err: any) {
      res.status(500).json({ error: 'AUTH_FAILED', message: err.message });
    }
  });

  app.get('/api/v1/users/me', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
  });

  app.put('/api/v1/users/me', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { name, age, gender, preferredLanguage, medicalInfo } = req.body;

    if (name) user.name = name;
    if (age) user.age = Number(age);
    if (gender) user.gender = gender;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;

    if (medicalInfo) {
      user.medicalInfo = {
        ...user.medicalInfo,
        ...medicalInfo
      };
    }

    db.users.set(user.id, user);
    db.logAudit(user.id, user.name, 'UPDATE_PROFILE', { preferredLanguage: user.preferredLanguage });
    res.json({ user, message: 'Profile updated successfully' });
  });

  /**
   * 2.3 FCM Token Registration & Refresh Endpoint
   */
  app.post('/api/v1/users/me/fcm-token', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { fcmToken, deviceId, platform } = req.body || {};

    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim() === '') {
      return res.status(400).json({ error: 'INVALID_FCM_TOKEN', message: 'Valid FCM registration token is required.' });
    }

    user.fcmToken = fcmToken.trim();
    user.isFcmTokenValid = true;
    db.users.set(user.id, user);

    // Update FCM token on any active trip memberships for this user
    for (const [tripId, members] of db.tripMembers.entries()) {
      const idx = members.findIndex(m => m.userId === user.id);
      if (idx !== -1) {
        members[idx].fcmToken = fcmToken.trim();
        members[idx].isFcmTokenValid = true;
        db.tripMembers.set(tripId, members);
      }
    }

    console.log(`[SafeRoad FCM Token Storage] Registered FCM token for user ${user.name} (${user.id}) [Platform: ${platform || 'Android/Web'}]`);
    db.logAudit(user.id, user.name, 'FCM_TOKEN_REGISTERED', { deviceId, platform: platform || 'Android/Web' });

    res.json({
      success: true,
      message: 'FCM token registered and associated with user profile.',
      userId: user.id,
      fcmTokenValid: true
    });
  });

  // ==========================================
  // 3. HOTEL VERIFICATION & AI RECOMMENDATION API
  // ==========================================
  app.get('/api/v1/places/hotels', async (req, res) => {
    const destination = (req.query.destination as string) || 'Shimla';
    const queryHotelName = req.query.query as string | undefined;

    try {
      const hotels = await searchAndVerifyHotels(destination, queryHotelName);
      res.json({ destination, verifiedHotels: hotels });
    } catch (err: any) {
      res.status(500).json({ error: 'HOTEL_SEARCH_FAILED', message: err.message });
    }
  });

  app.post('/api/v1/ai/hotel-recommendations', async (req, res) => {
    const { destination, preferences, queryHotelName } = req.body;
    try {
      const hotels = await getAIHotelRecommendations(
        destination || 'Shimla',
        preferences,
        queryHotelName
      );
      res.json({ destination, hotels });
    } catch (err: any) {
      res.status(500).json({ error: 'AI_HOTEL_REC_FAILED', message: err.message });
    }
  });

  // ==========================================
  // 4. TRIP MANAGEMENT & LIFECYCLE API
  // ==========================================
  app.post('/api/v1/trips', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { destination, transportMode, targetMembersCount, startDate, endDate, hotel } = req.body;

    // Validate single active trip constraint
    const existingActiveTrip = Array.from(db.trips.values()).find(t => {
      if (t.isArchived || t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
      const members = db.tripMembers.get(t.id) || [];
      return members.some(m => m.userId === user.id && m.status === 'APPROVED');
    });

    if (existingActiveTrip) {
      return res.status(400).json({
        error: 'SINGLE_TRIP_CONSTRAINT',
        message: 'A user cannot belong to two simultaneous active/upcoming trips.'
      });
    }

    // Verify hotel existence if provided
    let verifiedHotel = hotel;
    if (hotel && hotel.name) {
      const verifiedList = await searchAndVerifyHotels(destination, hotel.name);
      if (verifiedList.length > 0) {
        verifiedHotel = verifiedList[0];
      }
    }

    const tripId = 'trp_' + Math.random().toString(36).substring(2, 9);
    const code = db.generateTripCode().trim().toUpperCase();

    const isAlphanumeric6 = /^[A-Z0-9]{6}$/.test(code);
    console.log(`\n======================================================`);
    console.log(`[SafeRoad+ DB Insert] POST /api/v1/trips CREATION FLOW INITIATED`);
    console.log(`[SafeRoad+ DB Insert] Leader: ${user.name} (ID: ${user.id}, FirebaseUID: ${user.firebaseUid})`);
    console.log(`[SafeRoad+ DB Insert] Destination: "${destination || 'Active Fleet Expedition'}"`);
    console.log(`[SafeRoad+ DB Insert] Generated trip_code: "${code}" | Type: ${typeof code} | Length: ${code.length} | Alphanumeric (^[A-Z0-9]{6}$): ${isAlphanumeric6}`);
    console.log(`[SafeRoad+ DB Insert] Database Column: trips.trip_code (VARCHAR(6) / TEXT)`);
    console.log(`[SafeRoad+ DB Insert] SQL Equivalent: INSERT INTO trips (id, trip_code, destination, leader_id, status, is_archived, created_at) VALUES ('${tripId}', '${code}', '${destination || 'Active Fleet Expedition'}', '${user.id}', 'UPCOMING', false, NOW());`);
    console.log(`[SafeRoad+ DB Insert] Join Route Compatibility: Matches SELECT * FROM trips WHERE UPPER(TRIM(trip_code)) = '${code}' AND is_archived = false;`);
    console.log(`[SafeRoad+ DB Insert] Authoritative Trip Code Persisted: "${code}" for Trip ID "${tripId}"`);
    console.log(`======================================================\n`);

    const newTrip: Trip = {
      id: tripId,
      code,
      destination: destination || 'Active Fleet Expedition',
      transportMode: transportMode || 'Car',
      targetMembersCount: Number(targetMembersCount) || 4,
      currentMembersCount: 1,
      leaderId: user.id,
      leaderName: user.name,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'UPCOMING',
      safeBubbleRadiusMeters: 100, // Frozen default 100 meters
      hotel: verifiedHotel,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const leaderMember: TripMember = {
      id: 'mem_' + Math.random().toString(36).substring(2, 9),
      tripId,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      role: 'LEADER',
      status: 'APPROVED',
      joinedAt: new Date().toISOString(),
      boundaryStatus: 'INSIDE_BUBBLE'
    };

    db.trips.set(tripId, newTrip);
    db.tripMembers.set(tripId, [leaderMember]);

    db.logAudit(user.id, user.name, 'CREATE_TRIP', { tripId, code, destination });
    res.status(201).json({ trip: newTrip, leaderMember });
  });

  app.get('/api/v1/trips/active', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const allTrips = Array.from(db.trips.values()).filter(t => !t.isArchived && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

    // 1. Check if user is the Trip Leader of an active trip
    const leaderTrip = allTrips.find(t => t.leaderId === user.id);
    if (leaderTrip) {
      const allMembers = db.tripMembers.get(leaderTrip.id) || [];
      const approvedMembers = allMembers.filter(m => m.status === 'APPROVED');
      
      return res.json({
        activeTrip: leaderTrip,
        members: approvedMembers,
        role: 'LEADER'
      });
    }

    // 2. Check if user is an APPROVED member of an active trip
    for (const trip of allTrips) {
      const members = db.tripMembers.get(trip.id) || [];
      const userMembership = members.find(m => m.userId === user.id && m.status === 'APPROVED');
      if (userMembership) {
        const approvedMembers = members.filter(m => m.status === 'APPROVED');
        return res.json({
          activeTrip: trip,
          members: approvedMembers,
          role: 'MEMBER'
        });
      }
    }

    return res.json({ activeTrip: null, members: [], role: null });
  });

  app.post('/api/v1/trips/join', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripCode } = req.body;

    if (!tripCode || typeof tripCode !== 'string') {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing or invalid Trip Code.' });
    }

    // 1. Trip Code Normalization: trim whitespace and uppercase
    const normalizedCode = tripCode.trim().toUpperCase();
    const allTrips = Array.from(db.trips.values());
    const allActiveTrips = allTrips.filter(t => !t.isArchived);

    // 2. Search Database for matching active trip
    const targetTrip = allActiveTrips.find(
      t => t.code.trim().toUpperCase() === normalizedCode
    );

    if (!targetTrip) {
      return res.status(404).json({
        error: 'TRIP_NOT_FOUND',
        message: 'Invalid trip code. Please check the code and try again.'
      });
    }

    // 3. Confirm trip status is joinable
    if (targetTrip.status === 'COMPLETED' || targetTrip.status === 'CANCELLED' || targetTrip.isArchived) {
      return res.status(400).json({
        error: 'TRIP_CLOSED',
        message: 'This trip has ended and is no longer accepting members.'
      });
    }

    // 4. Expiry check: Code is invalid after trip end date
    const endDate = new Date(targetTrip.endDate);
    if (new Date() > endDate) {
      return res.status(400).json({
        error: 'TRIP_EXPIRED',
        message: 'This trip code has expired as the travel end date has passed.'
      });
    }

    // 5. Confirm user is not the Trip Leader trying to join their own trip
    if (targetTrip.leaderId === user.id) {
      return res.status(400).json({
        error: 'LEADER_CANNOT_JOIN_OWN_TRIP',
        message: 'You are the Trip Leader of this trip.'
      });
    }

    const members = db.tripMembers.get(targetTrip.id) || [];

    // 6. Check if user is already an approved member
    const existingMember = members.find(m => m.userId === user.id && m.status === 'APPROVED');
    if (existingMember) {
      return res.status(400).json({
        error: 'ALREADY_MEMBER',
        message: 'You are already a member of this trip.'
      });
    }

    // 7. Capacity check
    const approvedCount = members.filter(m => m.status === 'APPROVED').length;
    if (approvedCount >= targetTrip.targetMembersCount) {
      return res.status(400).json({
        error: 'TRIP_FULL',
        message: 'Trip is full. Maximum member capacity reached.'
      });
    }

    // 8. Add user directly to Trip Members (no approval needed)
    const now = new Date().toISOString();
    const newMember: TripMember = {
      id: 'mem_' + Math.random().toString(36).substring(2, 9),
      tripId: targetTrip.id,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      role: 'MEMBER',
      status: 'APPROVED',
      joinedAt: now,
      boundaryStatus: 'INSIDE_BUBBLE'
    };

    const updatedMembers = members.filter(m => m.userId !== user.id);
    updatedMembers.push(newMember);
    db.tripMembers.set(targetTrip.id, updatedMembers);

    targetTrip.currentMembersCount = updatedMembers.filter(m => m.status === 'APPROVED').length;
    targetTrip.updatedAt = now;

    // Notify Trip Leader that a member joined
    const leaderNotifs = db.notifications.get(targetTrip.leaderId) || [];
    leaderNotifs.unshift({
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      userId: targetTrip.leaderId,
      tripId: targetTrip.id,
      type: 'GENERAL',
      title: 'New Trip Member Joined',
      message: `${user.name} joined your trip to ${targetTrip.destination}.`,
      isRead: false,
      createdAt: now
    });
    db.notifications.set(targetTrip.leaderId, leaderNotifs);

    db.logAudit(user.id, user.name, 'JOIN_TRIP_DIRECT', { tripId: targetTrip.id, code: normalizedCode });

    return res.status(200).json({
      success: true,
      message: 'Successfully joined trip.',
      trip: targetTrip,
      member: newMember,
      members: updatedMembers.filter(m => m.status === 'APPROVED')
    });
  });

  // ==========================================
  // TRIP MESSAGING & CHAT API (SCOPED & AUTHORIZED)
  // ==========================================

  // Strict authorization helper for trip chat access
  const verifyTripChatAccess = (tripId: string, user: { id: string; name: string }) => {
    const trip = db.trips.get(tripId);
    if (!trip) {
      return {
        authorized: false,
        status: 404,
        error: 'TRIP_NOT_FOUND',
        message: 'Trip not found.',
        trip: null,
        role: null as 'LEADER' | 'MEMBER' | null
      };
    }

    // 1. Trip Leader is authorized
    if (trip.leaderId === user.id) {
      return {
        authorized: true,
        status: 200,
        trip,
        role: 'LEADER' as const
      };
    }

    const members = db.tripMembers.get(tripId) || [];
    const memberRecord = members.find(m => m.userId === user.id && m.status === 'APPROVED');

    // 2. User is an APPROVED member
    if (memberRecord) {
      return {
        authorized: true,
        status: 200,
        trip,
        role: 'MEMBER' as const
      };
    }

    // 3. User is NOT associated with the trip
    return {
      authorized: false,
      status: 403,
      error: 'NOT_A_MEMBER',
      message: 'Access denied: You must be a member or the Trip Leader to access trip messages.',
      trip,
      role: null
    };
  };

  // GET all messages for a specific trip (Strictly Leader or Approved Member only)
  app.get('/api/v1/trips/:tripId/messages', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;

    // Strict authorization check
    const authResult = verifyTripChatAccess(tripId, user);
    if (!authResult.authorized) {
      return res.status(authResult.status).json({
        error: authResult.error,
        message: authResult.message
      });
    }

    const messages = db.tripMessages.get(tripId) || [];
    // Sort oldest to newest (chronological order)
    const sortedMessages = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.json({
      success: true,
      tripId,
      userRole: authResult.role,
      count: sortedMessages.length,
      messages: sortedMessages
    });
  });

  // POST a new message to a specific trip (Strictly Leader or Approved Member only)
  app.post('/api/v1/trips/:tripId/messages', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;
    const { message, messageText, text } = req.body;

    const rawContent = message || messageText || text;
    if (!rawContent || typeof rawContent !== 'string' || !rawContent.trim()) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Message text cannot be empty.' });
    }

    // Strict authorization check
    const authResult = verifyTripChatAccess(tripId, user);
    if (!authResult.authorized) {
      return res.status(authResult.status).json({
        error: authResult.error,
        message: authResult.message
      });
    }

    const trip = authResult.trip!;
    const senderRole = authResult.role!;
    const now = new Date().toISOString();

    const newMessage: TripMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      tripId,
      senderId: user.id,
      senderName: user.name,
      senderEmail: user.email,
      senderPhotoURL: user.photoURL,
      senderRole,
      messageText: rawContent.trim(),
      createdAt: now,
      updatedAt: now
    };

    const tripMsgs = db.tripMessages.get(tripId) || [];
    tripMsgs.push(newMessage);
    db.tripMessages.set(tripId, tripMsgs);

    // Notify other approved participants in the trip
    const members = db.tripMembers.get(tripId) || [];
    const approvedMemberIds = members
      .filter(m => m.status === 'APPROVED' && m.userId !== user.id)
      .map(m => m.userId);

    if (senderRole !== 'LEADER' && trip.leaderId !== user.id) {
      approvedMemberIds.push(trip.leaderId);
    }

    for (const recipientId of approvedMemberIds) {
      const recipientNotifs = db.notifications.get(recipientId) || [];
      recipientNotifs.unshift({
        id: 'notif_' + Math.random().toString(36).substring(2, 9),
        userId: recipientId,
        tripId,
        type: 'LEADERSHIP',
        title: `Trip Chat: ${user.name}`,
        message: rawContent.trim().length > 60 ? rawContent.trim().substring(0, 57) + '...' : rawContent.trim(),
        isRead: false,
        createdAt: now
      });
      db.notifications.set(recipientId, recipientNotifs);
    }

    db.logAudit(user.id, user.name, 'SEND_TRIP_MESSAGE', {
      tripId,
      messageId: newMessage.id,
      role: senderRole
    });

    console.log(`[SafeRoad+ Chat] Persisted message ${newMessage.id} from ${user.name} (${senderRole}) in trip ${trip.destination}`);

    res.status(201).json({
      success: true,
      message: newMessage
    });
  });

  app.post('/api/v1/trips/:tripId/state', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;
    const { newState } = req.body as { newState: TripState };

    const trip = db.trips.get(tripId);
    if (!trip || trip.leaderId !== user.id) {
      return res.status(403).json({ error: 'UNAUTHORIZED', message: 'Only the Trip Leader can update trip state.' });
    }

    trip.status = newState;
    trip.updatedAt = new Date().toISOString();

    if (newState === 'COMPLETED') {
      // Notify all trip members and leader that trip is completed and review is available
      const members = db.tripMembers.get(tripId) || [];
      const participantIds = [trip.leaderId, ...members.filter(m => m.status === 'APPROVED').map(m => m.userId)];
      const uniqueIds = Array.from(new Set(participantIds));
      for (const uid of uniqueIds) {
        const notifs = db.notifications.get(uid) || [];
        notifs.unshift({
          id: 'notif_' + Math.random().toString(36).substring(2, 9),
          userId: uid,
          tripId,
          type: 'GENERAL',
          title: 'Trip Completed! 🎉',
          message: `Your trip to ${trip.destination} is marked COMPLETED. Please review your trip experience to help improve traveler safety.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
        db.notifications.set(uid, notifs);
      }
    }

    db.logAudit(user.id, user.name, 'UPDATE_TRIP_STATE', { tripId, newState });
    res.json({ trip, message: `Trip state updated to ${newState}` });
  });

  // ==========================================
  // 5. TRIP REVIEW & EXPERIENCE APIS
  // ==========================================

  /**
   * 5.1 Get Completed Trips for Current User (with Review Status)
   */
  app.get('/api/v1/trips/completed', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const allTrips = Array.from(db.trips.values()).filter(t => !t.isArchived && t.status === 'COMPLETED');

    const userCompletedTrips = allTrips.filter(t => {
      if (t.leaderId === user.id) return true;
      const members = db.tripMembers.get(t.id) || [];
      return members.some(m => m.userId === user.id && m.status === 'APPROVED');
    }).map(t => {
      const userReview = db.getUserTripReview(t.id, user.id);
      const members = db.tripMembers.get(t.id) || [];
      return {
        trip: t,
        membersCount: members.filter(m => m.status === 'APPROVED').length,
        hasReviewed: !!userReview,
        userReview: userReview || null
      };
    });

    res.json({ completedTrips: userCompletedTrips });
  });

  /**
   * 5.2 Submit or Update Trip Review
   * STRICT REQUIREMENT: Only available when TRIP STATUS = COMPLETED
   */
  app.post('/api/v1/trips/:tripId/reviews', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;
    const {
      overallRating,
      safetyRating,
      routeRating,
      routeFeltSafe,
      destinationRating,
      destinationExperiences,
      safetyIssueType,
      safetyIssueDetails,
      featureRatings,
      suggestions
    } = req.body;

    // 1. Verify trip exists
    const trip = db.trips.get(tripId);
    if (!trip) {
      return res.status(404).json({ error: 'TRIP_NOT_FOUND', message: 'Trip does not exist.' });
    }

    // 2. Critical Requirement: Trip Review ONLY available when trip status is COMPLETED
    if (trip.status !== 'COMPLETED') {
      return res.status(400).json({
        error: 'TRIP_NOT_COMPLETED',
        message: 'Trip reviews can only be submitted after the trip is completed. Current status: ' + trip.status
      });
    }

    // 3. Verify user was leader or approved member
    const members = db.tripMembers.get(tripId) || [];
    const isLeader = trip.leaderId === user.id;
    const isApprovedMember = members.some(m => m.userId === user.id && m.status === 'APPROVED');
    if (!isLeader && !isApprovedMember) {
      return res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'Only registered participants of this trip can submit a review.'
      });
    }

    // 4. Validate rating values
    const oRating = Number(overallRating);
    if (!oRating || oRating < 1 || oRating > 5) {
      return res.status(400).json({ error: 'INVALID_OVERALL_RATING', message: 'Overall trip rating must be between 1 and 5.' });
    }

    const sRating = Number(safetyRating);
    if (!sRating || sRating < 1 || sRating > 5) {
      return res.status(400).json({ error: 'INVALID_SAFETY_RATING', message: 'Safety feeling rating must be between 1 and 5.' });
    }

    const validRouteRatings = ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
    const validRouteFeltSafe = ['Yes', 'Partially', 'No', 'Not Applicable'];
    const validSafetyIssueTypes = ['No issues', 'Minor issue', 'Safety concern', 'Emergency situation'];

    const existingReview = db.getUserTripReview(tripId, user.id);
    const now = new Date().toISOString();

    const review: TripReview = {
      id: existingReview ? existingReview.id : 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      tripId,
      tripCode: trip.code,
      destination: trip.destination,
      userId: user.id,
      userName: user.name,
      userRole: isLeader ? 'LEADER' : 'MEMBER',
      overallRating: oRating as any,
      safetyRating: sRating as any,
      routeRating: validRouteRatings.includes(routeRating) ? routeRating : 'Good',
      routeFeltSafe: validRouteFeltSafe.includes(routeFeltSafe) ? routeFeltSafe : 'Yes',
      destinationRating: Number(destinationRating) >= 1 && Number(destinationRating) <= 5 ? Number(destinationRating) : 5,
      destinationExperiences: Array.isArray(destinationExperiences) ? destinationExperiences : [],
      safetyIssueType: validSafetyIssueTypes.includes(safetyIssueType) ? safetyIssueType : 'No issues',
      safetyIssueDetails: safetyIssueType !== 'No issues' && safetyIssueDetails ? String(safetyIssueDetails).trim() : undefined,
      featureRatings: featureRatings && typeof featureRatings === 'object' ? {
        aiSafetyGuide: featureRatings.aiSafetyGuide ?? null,
        safeRouteRecommendation: featureRatings.safeRouteRecommendation ?? null,
        smartSafeBubble: featureRatings.smartSafeBubble ?? null,
        safetyAlerts: featureRatings.safetyAlerts ?? null,
        sosEmergencySupport: featureRatings.sosEmergencySupport ?? null,
        offlineSafetyFeatures: featureRatings.offlineSafetyFeatures ?? null
      } : {
        aiSafetyGuide: null,
        safeRouteRecommendation: null,
        smartSafeBubble: null,
        safetyAlerts: null,
        sosEmergencySupport: null,
        offlineSafetyFeatures: null
      },
      suggestions: suggestions ? String(suggestions).trim() : undefined,
      createdAt: existingReview ? existingReview.createdAt : now,
      updatedAt: now
    };

    db.saveTripReview(review);
    db.logAudit(user.id, user.name, 'SUBMIT_TRIP_REVIEW', {
      tripId,
      reviewId: review.id,
      destination: trip.destination,
      overallRating: review.overallRating,
      safetyRating: review.safetyRating,
      safetyIssueType: review.safetyIssueType
    });

    res.status(201).json({
      success: true,
      review,
      message: 'Trip review submitted successfully. Thank you for making SafeRoad+ safer for all travelers!'
    });
  });

  /**
   * 5.3 Get Current User's Review for a Trip
   */
  app.get('/api/v1/trips/:tripId/reviews/me', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;
    const review = db.getUserTripReview(tripId, user.id);
    res.json({ review: review || null });
  });

  /**
   * 5.4 Get All Reviews for a Trip
   */
  app.get('/api/v1/trips/:tripId/reviews', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const { tripId } = req.params;
    const reviews = db.getTripReviews(tripId);
    res.json({ reviews });
  });

  /**
   * 5.5 Destination Review & Community Intelligence Summary
   */
  app.get('/api/v1/destinations/:destination/reviews/summary', (req: Request, res: Response) => {
    const { destination } = req.params;
    const reviews = db.getDestinationReviews(destination);

    if (reviews.length === 0) {
      const emptySummary: DestinationReviewSummary = {
        destination,
        totalReviews: 0,
        averageOverallRating: 5.0,
        averageSafetyRating: 5.0,
        averageDestinationRating: 5.0,
        safetyIssueCount: 0,
        topExperiences: [],
        routeSafetyPercentage: 100,
        recentReviews: []
      };
      return res.json({ summary: emptySummary });
    }

    const totalReviews = reviews.length;
    const avgOverall = Number((reviews.reduce((s, r) => s + r.overallRating, 0) / totalReviews).toFixed(1));
    const avgSafety = Number((reviews.reduce((s, r) => s + r.safetyRating, 0) / totalReviews).toFixed(1));
    const avgDest = Number((reviews.reduce((s, r) => s + (r.destinationRating || 5), 0) / totalReviews).toFixed(1));
    const safetyIssueCount = reviews.filter(r => r.safetyIssueType && r.safetyIssueType !== 'No issues').length;
    const safeRouteCount = reviews.filter(r => r.routeFeltSafe === 'Yes' || r.routeFeltSafe === 'Not Applicable').length;
    const routeSafetyPercentage = Math.round((safeRouteCount / totalReviews) * 100);

    // Count experiences
    const expCounts = new Map<string, number>();
    for (const r of reviews) {
      for (const exp of r.destinationExperiences || []) {
        expCounts.set(exp, (expCounts.get(exp) || 0) + 1);
      }
    }
    const topExperiences = Array.from(expCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    const recentReviews = reviews.slice(-5).reverse().map(r => ({
      id: r.id,
      userName: r.userName,
      overallRating: r.overallRating,
      safetyRating: r.safetyRating,
      routeRating: r.routeRating,
      destinationRating: r.destinationRating,
      destinationExperiences: r.destinationExperiences,
      safetyIssueType: r.safetyIssueType,
      suggestions: r.suggestions,
      createdAt: r.createdAt
    }));

    const summary: DestinationReviewSummary = {
      destination,
      totalReviews,
      averageOverallRating: avgOverall,
      averageSafetyRating: avgSafety,
      averageDestinationRating: avgDest,
      safetyIssueCount,
      topExperiences,
      routeSafetyPercentage,
      recentReviews
    };

    res.json({ summary });
  });

  app.post('/api/v1/trips/:tripId/transfer-leadership', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;
    const { newLeaderUserId } = req.body;

    const trip = db.trips.get(tripId);
    if (!trip || trip.leaderId !== user.id) {
      return res.status(403).json({ error: 'UNAUTHORIZED', message: 'Only current Trip Leader can transfer leadership.' });
    }

    const members = db.tripMembers.get(tripId) || [];
    const target = members.find(m => m.userId === newLeaderUserId && m.status === 'APPROVED');

    if (!target) {
      return res.status(400).json({ error: 'INVALID_MEMBER', message: 'New leader must be an approved trip member.' });
    }

    // Demote current leader
    const currentLeaderMember = members.find(m => m.userId === user.id);
    if (currentLeaderMember) currentLeaderMember.role = 'MEMBER';

    // Promote target
    target.role = 'LEADER';
    trip.leaderId = target.userId;
    trip.leaderName = target.userName;

    db.logAudit(user.id, user.name, 'TRANSFER_LEADERSHIP', { tripId, newLeaderUserId });
    res.json({ trip, message: `Leadership transferred to ${target.userName}` });
  });

  app.delete('/api/v1/trips/:tripId', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;

    const trip = db.trips.get(tripId);
    if (!trip || trip.leaderId !== user.id) {
      return res.status(403).json({ error: 'UNAUTHORIZED', message: 'Only Trip Leader can soft-delete/archive trip.' });
    }

    trip.isArchived = true;
    trip.status = 'ARCHIVED';

    db.logAudit(user.id, user.name, 'ARCHIVE_TRIP', { tripId });
    res.json({ message: 'Trip archived successfully. Historical records preserved for audit.' });
  });

  // ==========================================
  // 5. DYNAMIC SAFE BUBBLE & GPS TRACKING API
  // ==========================================

  /**
   * Location Update Endpoint
   * If Leader emits: Safe Bubble center dynamically updates and all members are re-evaluated.
   * If Member emits: Member's distance to Leader is evaluated, boundary status updated with debouncing.
   * Real-time location is broadcast to all active WebSocket clients.
   */
  app.post('/api/v1/trips/:tripId/location', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;
    const { latitude, longitude, accuracy, altitude, heading, speed, timestamp } = req.body;

    const trip = db.trips.get(tripId);
    if (!trip || trip.status === 'COMPLETED' || trip.status === 'CANCELLED' || trip.isArchived) {
      return res.status(400).json({ error: 'TRIP_INACTIVE', message: 'Dynamic Safe Bubble is monitored during ACTIVE trips only.' });
    }

    const members = db.tripMembers.get(tripId) || [];
    const isLeader = trip.leaderId === user.id;
    const member = members.find(m => m.userId === user.id);
    if (!isLeader && (!member || member.status !== 'APPROVED')) {
      return res.status(403).json({ error: 'MEMBER_NOT_APPROVED', message: 'Only approved trip participants can emit locations.' });
    }

    const updateResult = locationWebSocketService.processLocationUpdate(tripId, user, {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy !== undefined ? Number(accuracy) : 10,
      altitude: altitude !== undefined ? Number(altitude) : null,
      heading: heading !== undefined ? Number(heading) : null,
      speed: speed !== undefined ? Number(speed) : null,
      timestamp: timestamp || new Date().toISOString()
    });

    if (!updateResult) {
      return res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Invalid location coordinates received.' });
    }

    const leaderStatus = getLeaderLocationStatus(trip);

    res.json({
      member: member || {
        id: `mem_leader_${user.id}`,
        tripId,
        userId: user.id,
        userName: user.name,
        role: 'LEADER',
        status: 'APPROVED',
        joinedAt: trip.createdAt,
        lastLatitude: trip.leaderLatitude,
        lastLongitude: trip.leaderLongitude,
        accuracyMeters: trip.leaderAccuracyMeters,
        lastLocationUpdate: trip.leaderLastLocationUpdate,
        distanceFromLeaderMeters: 0,
        boundaryStatus: 'INSIDE_BUBBLE'
      },
      trip: {
        id: trip.id,
        leaderId: trip.leaderId,
        leaderName: trip.leaderName,
        leaderLatitude: trip.leaderLatitude,
        leaderLongitude: trip.leaderLongitude,
        leaderAccuracyMeters: trip.leaderAccuracyMeters,
        leaderLastLocationUpdate: trip.leaderLastLocationUpdate,
        safeBubbleRadiusMeters: trip.safeBubbleRadiusMeters,
        leaderStatus: leaderStatus.status,
        isLeaderStale: leaderStatus.isStale,
        ageSeconds: leaderStatus.ageSeconds,
        uiState: leaderStatus.uiState,
        statusMessage: leaderStatus.statusMessage
      },
      members: members.filter(m => m.status === 'APPROVED').map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.userName,
        role: m.role,
        lastLatitude: m.lastLatitude,
        lastLongitude: m.lastLongitude,
        accuracyMeters: m.accuracyMeters,
        lastLocationUpdate: m.lastLocationUpdate,
        distanceFromLeaderMeters: m.distanceFromLeaderMeters,
        boundaryStatus: m.boundaryStatus,
        boundaryResponse: m.boundaryResponse
      }))
    });
  });

  /**
   * Dedicated Leader Location Endpoint
   * Returns authenticated, verified latest GPS coordinate of the active trip's current Leader
   */
  app.get('/api/v1/trips/:tripId/leader-location', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;

    const trip = db.trips.get(tripId);
    if (!trip) {
      return res.status(404).json({ error: 'TRIP_NOT_FOUND', message: 'Trip not found' });
    }

    // Verify user belongs to trip or is leader
    const members = db.tripMembers.get(tripId) || [];
    const isMemberOrLeader = trip.leaderId === user.id || members.some(m => m.userId === user.id && m.status === 'APPROVED');
    if (!isMemberOrLeader) {
      return res.status(403).json({ error: 'UNAUTHORIZED', message: 'User is not a member or leader of this trip.' });
    }

    const leaderStatus = getLeaderLocationStatus(trip);

    res.json({
      trip_id: trip.id,
      user_id: trip.leaderId,
      leader_name: trip.leaderName,
      role: 'LEADER',
      latitude: trip.leaderLatitude ?? null,
      longitude: trip.leaderLongitude ?? null,
      accuracy: trip.leaderAccuracyMeters ?? null,
      timestamp: trip.leaderLastLocationUpdate ?? null,
      status: leaderStatus.status,
      isStale: leaderStatus.isStale,
      ageSeconds: leaderStatus.ageSeconds,
      accuracySufficient: leaderStatus.accuracySufficient,
      uiState: leaderStatus.uiState,
      statusMessage: leaderStatus.statusMessage,
      safeBubbleRadiusMeters: trip.safeBubbleRadiusMeters || 100
    });
  });

  /**
   * Member Locations Endpoint
   */
  app.get('/api/v1/trips/:tripId/members/locations', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;

    const trip = db.trips.get(tripId);
    if (!trip) {
      return res.status(404).json({ error: 'TRIP_NOT_FOUND', message: 'Trip not found' });
    }

    const members = db.tripMembers.get(tripId) || [];
    const leaderStatus = getLeaderLocationStatus(trip);

    res.json({
      tripId: trip.id,
      tripStatus: trip.status,
      safeBubbleRadiusMeters: trip.safeBubbleRadiusMeters,
      leader: {
        user_id: trip.leaderId,
        leader_name: trip.leaderName,
        role: 'LEADER',
        latitude: trip.leaderLatitude ?? null,
        longitude: trip.leaderLongitude ?? null,
        accuracy: trip.leaderAccuracyMeters ?? null,
        timestamp: trip.leaderLastLocationUpdate ?? null,
        status: leaderStatus.status,
        isStale: leaderStatus.isStale,
        ageSeconds: leaderStatus.ageSeconds,
        uiState: leaderStatus.uiState
      },
      members: members.filter(m => m.status === 'APPROVED').map(m => ({
        user_id: m.userId,
        user_name: m.userName,
        role: m.role,
        latitude: m.lastLatitude ?? null,
        longitude: m.lastLongitude ?? null,
        accuracy: m.accuracyMeters ?? null,
        timestamp: m.lastLocationUpdate ?? null,
        distanceFromLeaderMeters: m.distanceFromLeaderMeters ?? 0,
        boundaryStatus: m.boundaryStatus ?? 'INSIDE_BUBBLE'
      }))
    });
  });

  /**
   * Real-time Dynamic Bubble Telemetry Endpoint
   */
  app.get('/api/v1/trips/:tripId/bubble-telemetry', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const { tripId } = req.params;
    const trip = db.trips.get(tripId);
    if (!trip) {
      return res.status(404).json({ error: 'TRIP_NOT_FOUND', message: 'Trip not found' });
    }

    const members = db.tripMembers.get(tripId) || [];
    const leaderStatus = getLeaderLocationStatus(trip);

    res.json({
      tripId: trip.id,
      tripStatus: trip.status,
      safeBubbleRadiusMeters: trip.safeBubbleRadiusMeters,
      leader: {
        id: trip.leaderId,
        user_id: trip.leaderId,
        name: trip.leaderName,
        latitude: trip.leaderLatitude,
        longitude: trip.leaderLongitude,
        accuracyMeters: trip.leaderAccuracyMeters,
        lastLocationUpdate: trip.leaderLastLocationUpdate,
        status: leaderStatus.status,
        isStale: leaderStatus.isStale,
        ageSeconds: leaderStatus.ageSeconds,
        accuracySufficient: leaderStatus.accuracySufficient,
        uiState: leaderStatus.uiState,
        statusMessage: leaderStatus.statusMessage
      },
      members: members.filter(m => m.status === 'APPROVED'),
      config: GEOFENCE_CONFIG
    });
  });

  /**
   * Safe Bubble Configuration Endpoint (Leader only)
   */
  app.put('/api/v1/trips/:tripId/safe-bubble', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;
    const { radiusMeters } = req.body;

    const trip = db.trips.get(tripId);
    if (!trip || trip.leaderId !== user.id) {
      return res.status(403).json({ error: 'UNAUTHORIZED', message: 'Only Trip Leader can change Safe Bubble radius.' });
    }

    trip.safeBubbleRadiusMeters = Number(radiusMeters);
    db.logAudit(user.id, user.name, 'UPDATE_SAFE_BUBBLE', { tripId, radiusMeters });

    res.json({ trip, message: `Safe Bubble radius updated to ${radiusMeters}m` });
  });

  /**
   * Member Response to Boundary Alert: "I'm Safe" or "Need Help"
   */
  app.post('/api/v1/trips/:tripId/boundary-response', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;
    const { response } = req.body as { response: 'I_AM_SAFE' | 'NEED_HELP' };

    const trip = db.trips.get(tripId);
    const members = db.tripMembers.get(tripId) || [];
    const member = members.find(m => m.userId === user.id);

    if (member) {
      member.boundaryResponse = response;

      if (response === 'I_AM_SAFE') {
        // Notify Leader
        if (trip && trip.leaderId !== user.id) {
          const leaderNotifs = db.notifications.get(trip.leaderId) || [];
          leaderNotifs.unshift({
            id: 'notif_' + Math.random().toString(36).substring(2, 9),
            userId: trip.leaderId,
            tripId,
            type: 'GENERAL',
            title: `✅ Safe Confirmation: ${user.name}`,
            message: `${user.name} responded "I'm Safe" (${member.distanceFromLeaderMeters || 0}m from you).`,
            isRead: false,
            createdAt: new Date().toISOString()
          });
          db.notifications.set(trip.leaderId, leaderNotifs);
        }

        db.logAudit(user.id, user.name, 'MEMBER_BOUNDARY_ACK_SAFE', {
          tripId,
          distanceFromLeader: member.distanceFromLeaderMeters,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({ member, message: `Boundary status updated to ${response}` });
  });

  // ==========================================
  // 6. EMERGENCY CONTACT & SOS EMERGENCY API
  // ==========================================
  app.get('/api/v1/users/me/emergency-contact', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const contact = user.emergencyContact || (user.medicalInfo.emergencyContactPhone ? {
      id: 'ec_' + user.id,
      userId: user.id,
      name: user.medicalInfo.emergencyContactName || 'Emergency Contact',
      relationship: 'Emergency Contact',
      phone: user.medicalInfo.emergencyContactPhone,
      preferredNotificationMethod: 'SMS' as const,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } : null);

    res.json({ emergencyContact: contact });
  });

  app.post('/api/v1/users/me/emergency-contact', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { name, relationship, phone, countryCode, phoneNumber, email, preferredNotificationMethod } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Name and phone number are required for emergency contact' });
    }

    const now = new Date().toISOString();
    const contact: EmergencyContact = {
      id: user.emergencyContact?.id || 'ec_' + user.id,
      userId: user.id,
      name: name.trim(),
      relationship: (relationship || 'Family').trim(),
      countryCode: countryCode ? countryCode.trim() : undefined,
      phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      preferredNotificationMethod: preferredNotificationMethod || 'SMS',
      isVerified: true,
      createdAt: user.emergencyContact?.createdAt || now,
      updatedAt: now
    };

    user.emergencyContact = contact;
    user.medicalInfo.emergencyContactName = contact.name;
    user.medicalInfo.emergencyContactPhone = contact.phone;

    db.users.set(user.id, user);
    db.logAudit(user.id, user.name, 'UPDATE_EMERGENCY_CONTACT', { contactName: contact.name, phone: contact.phone, preferredNotificationMethod: contact.preferredNotificationMethod });

    res.json({ emergencyContact: contact, message: 'Emergency contact saved successfully' });
  });

  app.delete('/api/v1/users/me/emergency-contact', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    user.emergencyContact = undefined;
    user.medicalInfo.emergencyContactName = '';
    user.medicalInfo.emergencyContactPhone = '';

    db.users.set(user.id, user);
    db.logAudit(user.id, user.name, 'REMOVE_EMERGENCY_CONTACT', {});

    res.json({ success: true, message: 'Emergency contact removed successfully' });
  });

  /**
   * 6.1 Create SOS Alert (Starts 10-second countdown or offline pending queue)
   */
  app.post('/api/v1/trips/:tripId/sos', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;
    const { latitude, longitude, accuracy, isLastKnownLocation, idempotencyKey, isOfflinePending } = req.body;

    try {
      const sos = createSOSAlert(
        tripId,
        user.id,
        Number(latitude),
        Number(longitude),
        accuracy !== undefined ? Number(accuracy) : 8,
        Boolean(isLastKnownLocation),
        idempotencyKey,
        Boolean(isOfflinePending)
      );

      res.status(201).json({
        sos_id: sos.id,
        status: sos.status,
        created_at: sos.createdAt,
        location: {
          latitude: sos.latitude,
          longitude: sos.longitude,
          accuracy: sos.accuracy
        },
        sos,
        message: isOfflinePending
          ? 'SOS saved locally. Waiting for network connection.'
          : 'Emergency SOS initiated. 10-second cancellation timer active.'
      });
    } catch (err: any) {
      const statusCode = err.message.includes('UNAUTHORIZED') || err.message.includes('TRIP_INACTIVE') ? 403 : 500;
      res.status(statusCode).json({ error: 'SOS_FAILED', message: err.message });
    }
  });

  /**
   * 6.2 Activate SOS Alert (After 10s countdown completes or immediate confirmation)
   * Obtains latest valid location, activates SOS, and triggers automatic backend SMS dispatch
   */
  app.post('/api/v1/sos/:sosId/activate', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { sosId } = req.params;
    const { location } = req.body || {};

    try {
      const sos = await activateSOSAlert(sosId, user.id, location);
      res.json({
        sos_id: sos.id,
        status: sos.status,
        created_at: sos.createdAt,
        activated_at: sos.activatedAt,
        location: {
          latitude: sos.latitude,
          longitude: sos.longitude,
          accuracy: sos.accuracy
        },
        emergencyContactDetails: sos.emergencyContactDetails,
        emergencyContactNotified: sos.emergencyContactNotified,
        sos,
        message: '🚨 EMERGENCY SOS ACTIVATED. FCM notifications pushed to active trip members & emergency contact notified.'
      });
    } catch (err: any) {
      res.status(500).json({ error: 'ACTIVATION_FAILED', message: err.message });
    }
  });

  /**
   * 6.2b Retry Emergency Contact SMS Dispatch (If previous attempt failed)
   */
  app.post('/api/v1/sos/:sosId/retry-sms', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { sosId } = req.params;

    try {
      const sos = await retryEmergencyContactSms(sosId, user.id);
      res.json({
        sos_id: sos.id,
        emergencyContactDetails: sos.emergencyContactDetails,
        emergencyContactNotified: sos.emergencyContactNotified,
        sos,
        message: 'Emergency contact SMS dispatch re-attempted.'
      });
    } catch (err: any) {
      res.status(500).json({ error: 'RETRY_FAILED', message: err.message });
    }
  });

  /**
   * 6.2c Retrieve SMS Dispatch & Delivery Status for SOS
   */
  app.get('/api/v1/sos/:sosId/sms-status', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const { sosId } = req.params;
    const smsRecord = db.emergencySmsRecords.get(sosId);
    const recipientRecords = db.getEmergencySmsForSos(sosId);
    const sos = db.sosRecords.get(sosId);

    if (!sos) {
      return res.status(404).json({ error: 'SOS_NOT_FOUND', message: 'SOS incident not found' });
    }

    res.json({
      sosId,
      sosStatus: sos.status,
      communicationStatus: sos.communicationStatus || {
        sosCreated: true,
        tripLeaderNotified: sos.status === 'ACTIVE',
        smsSubmitted: sos.emergencyContactNotified,
        teamMembersNotified: true
      },
      smsAlertsSummary: sos.smsAlertsSummary || null,
      recipientSmsRecords: recipientRecords,
      emergencyContactNotified: sos.emergencyContactNotified,
      emergencyContactDetails: sos.emergencyContactDetails,
      smsRecord: smsRecord || null
    });
  });

  /**
   * 6.2d Twilio SMS Delivery Status Webhook / Callback
   */
  app.post('/api/v1/sms/status-callback', express.urlencoded({ extended: false }), (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, any>;
    const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = body;
    console.log(`[SafeRoad Twilio Webhook] MessageSid: ${MessageSid}, Status: ${MessageStatus}, ErrorCode: ${ErrorCode}`);

    if (MessageSid) {
      for (const [sosId, record] of db.emergencySmsRecords.entries()) {
        if (record.providerMessageId === MessageSid) {
          const now = new Date().toISOString();
          if (MessageStatus === 'delivered') {
            record.status = 'DELIVERED';
            record.deliveredAt = now;
          } else if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
            record.status = 'FAILED';
            record.failureReason = ErrorMessage || `Twilio status: ${MessageStatus} (Code: ${ErrorCode})`;
          } else if (MessageStatus === 'sent') {
            record.status = 'SENT';
          }

          const sos = db.sosRecords.get(sosId);
          if (sos && sos.emergencyContactDetails) {
            sos.emergencyContactDetails.deliveryStatus = record.status;
            if (record.status === 'DELIVERED') {
              sos.emergencyContactDetails.deliveredAt = now;
            }
            if (record.failureReason) {
              sos.emergencyContactDetails.failureReason = record.failureReason;
            }
            db.sosRecords.set(sosId, sos);
          }
          break;
        }
      }
    }

    res.status(200).send('<Response></Response>');
  });

  /**
   * 6.2e Direct Server-Side Test Emergency SMS Dispatch
   */
  app.post('/api/v1/users/me/test-emergency-sms', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    if (!user.emergencyContact?.phone && !user.medicalInfo?.emergencyContactPhone) {
      return res.status(400).json({ error: 'NO_CONTACT', message: 'No emergency contact phone registered in profile' });
    }

    try {
      const { latitude, longitude } = (req.body || {}) as { latitude?: number; longitude?: number };
      const lat = typeof latitude === 'number' ? latitude : 37.7749;
      const lng = typeof longitude === 'number' ? longitude : -122.4194;
      const testResult = await notifyEmergencyContact(
        user,
        'SafeRoad System Diagnostic Test',
        lat,
        lng,
        false,
        5,
        `test_${Date.now()}`
      );
      res.json({
        result: testResult,
        message: testResult.contactNotified
          ? 'Test emergency SMS dispatched automatically by SafeRoad+ backend.'
          : `Dispatch attempted: ${testResult.deliveryStatus} (${testResult.details || 'Check logs'})`
      });
    } catch (err: any) {
      res.status(500).json({ error: 'TEST_FAILED', message: err.message });
    }
  });

  /**
   * 6.3 Cancel SOS Alert within 10-Second Window
   */
  app.post('/api/v1/sos/:sosId/cancel', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { sosId } = req.params;
    const { reason } = req.body || {};

    try {
      const sos = cancelSOSAlert(sosId, user.id, reason);
      res.json({ sos, message: 'SOS cancelled successfully within countdown window. No alerts were broadcast.' });
    } catch (err: any) {
      res.status(400).json({ error: 'CANCEL_FAILED', message: err.message });
    }
  });

  /**
   * 6.4 Acknowledge Active SOS (Member or Leader)
   */
  app.post('/api/v1/sos/:sosId/acknowledge', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { sosId } = req.params;

    try {
      const sos = acknowledgeSOSAlert(sosId, user.id);
      res.json({ sos, message: `${user.name} acknowledged the SOS emergency alert.` });
    } catch (err: any) {
      res.status(400).json({ error: 'ACKNOWLEDGE_FAILED', message: err.message });
    }
  });

  /**
   * 6.5 Update Live Location of Active SOS
   */
  app.put('/api/v1/sos/:sosId/location', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { sosId } = req.params;
    const { latitude, longitude, accuracy } = req.body;

    try {
      const sos = updateSOSLocation(sosId, user.id, Number(latitude), Number(longitude), accuracy ? Number(accuracy) : 8);
      res.json({ sos, message: 'SOS live location telemetry updated.' });
    } catch (err: any) {
      res.status(400).json({ error: 'LOCATION_UPDATE_FAILED', message: err.message });
    }
  });

  /**
   * 6.6 Escalate SOS to Emergency Authorities (Leader only)
   */
  app.post('/api/v1/sos/:sosId/escalate', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { sosId } = req.params;
    const { authority } = req.body as { authority: AuthorityType };

    try {
      const result = escalateSOSAlert(sosId, user.id, authority);
      res.json({
        sos: result.sos,
        contactNumber: result.dispatchContact,
        message: `SOS escalated to ${authority} emergency response dispatch.`
      });
    } catch (err: any) {
      res.status(403).json({ error: 'ESCALATION_FAILED', message: err.message });
    }
  });

  /**
   * 6.7 Resolve SOS Alert (Leader or Victim)
   */
  app.post('/api/v1/sos/:sosId/resolve', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { sosId } = req.params;
    const { notes } = req.body || {};

    try {
      const sos = resolveSOSAlert(sosId, user.id, notes);
      res.json({ sos, message: 'SOS marked as RESOLVED.' });
    } catch (err: any) {
      res.status(403).json({ error: 'RESOLVE_FAILED', message: err.message });
    }
  });

  /**
   * 6.8 Get Specific SOS Details
   */
  app.get('/api/v1/sos/:sosId', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const { sosId } = req.params;
    const sos = db.sosRecords.get(sosId);
    if (!sos) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'SOS incident record not found' });
    }
    res.json({ sos });
  });

  /**
   * 6.9 Get All SOS Incidents for a Trip (Active & Historic)
   */
  app.get('/api/v1/trips/:tripId/sos-incidents', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const { tripId } = req.params;
    const incidents = Array.from(db.sosRecords.values())
      .filter(s => s.tripId === tripId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      incidents,
      activeIncidents: incidents.filter(s => s.status === 'INITIATED' || s.status === 'ACTIVE' || s.status === 'ACKNOWLEDGED' || s.status === 'ESCALATED'),
      resolvedIncidents: incidents.filter(s => s.status === 'RESOLVED' || s.status === 'CANCELLED')
    });
  });

  /**
   * 6.9.1 Get Active SOS Incident for Trip (Used by Leader & Member clients)
   */
  app.get('/api/v1/trips/:tripId/active-sos', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const { tripId } = req.params;
    const activeIncident = Array.from(db.sosRecords.values())
      .filter(s => s.tripId === tripId && (s.status === 'INITIATED' || s.status === 'ACTIVE' || s.status === 'ACKNOWLEDGED' || s.status === 'ESCALATED'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;

    res.json({
      activeSos: activeIncident,
      hasActiveSos: Boolean(activeIncident)
    });
  });

  /**
   * 6.9.2 SOS Diagnostics & Telemetry Endpoint (For development verification)
   */
  app.get('/api/v1/sos/diagnostics', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const allRecords = Array.from(db.sosRecords.values());
    const latestSos = allRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;

    let fcmRecipientsCount = 0;
    let fcmSuccessCount = 0;
    let fcmFailureCount = 0;

    if (latestSos && latestSos.recipientDeliveryStatus) {
      fcmRecipientsCount = latestSos.recipientDeliveryStatus.length;
      fcmSuccessCount = latestSos.recipientDeliveryStatus.filter(r => r.delivered).length;
      fcmFailureCount = latestSos.recipientDeliveryStatus.filter(r => !r.delivered).length;
    }

    res.json({
      status: 'OK',
      backendService: 'SafeRoad SOS Engine v4.1',
      database: {
        status: 'CONNECTED',
        totalSosRecords: allRecords.length,
        activeSosRecords: allRecords.filter(s => s.status === 'ACTIVE' || s.status === 'INITIATED' || s.status === 'ACKNOWLEDGED' || s.status === 'ESCALATED').length
      },
      latestSos: latestSos ? {
        id: latestSos.id,
        tripId: latestSos.tripId,
        status: latestSos.status,
        userName: latestSos.userName,
        role: latestSos.role,
        createdAt: latestSos.createdAt,
        fcmRecipientsCount,
        fcmSuccessCount,
        fcmFailureCount,
        emergencyContactNotified: latestSos.emergencyContactNotified,
        emergencyContactDeliveryStatus: latestSos.emergencyContactDetails?.deliveryStatus || 'NONE'
      } : null
    });
  });

  /**
   * 6.10 Sync Offline Queued SOS Record
   */
  app.post('/api/v1/sos/sync-offline', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId, latitude, longitude, accuracy, isLastKnownLocation, idempotencyKey, wasCancelledLocally } = req.body;

    try {
      if (wasCancelledLocally) {
        return res.json({ status: 'CANCELLED_LOCALLY', message: 'Offline cancelled SOS acknowledged without dispatch.' });
      }

      const sos = createSOSAlert(
        tripId,
        user.id,
        Number(latitude),
        Number(longitude),
        accuracy ? Number(accuracy) : 8,
        Boolean(isLastKnownLocation),
        idempotencyKey,
        false
      );

      // Immediately activate since offline countdown already finished on client
      const activatedSos = await activateSOSAlert(sos.id, user.id);

      res.json({
        sos: activatedSos,
        message: 'Offline SOS synced to backend and active emergency notifications dispatched.'
      });
    } catch (err: any) {
      res.status(500).json({ error: 'OFFLINE_SYNC_FAILED', message: err.message });
    }
  });

  /**
   * 6.11 Privacy-Controlled Medical Info
   */
  app.get('/api/v1/sos/:sosId/medical-info', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { sosId } = req.params;

    try {
      const profile = getEmergencyMedicalProfile(sosId, user.id, false);
      res.json(profile);
    } catch (err: any) {
      res.status(403).json({ error: 'ACCESS_DENIED', message: err.message });
    }
  });

  /**
   * 6.12 Authority / Police / Hospital Dispatch Console
   */
  app.get('/api/v1/sos/authority-dashboard', (req, res) => {
    const activeSosList = Array.from(db.sosRecords.values()).filter(
      s => s.status === 'INITIATED' || s.status === 'ACTIVE' || s.status === 'ACKNOWLEDGED' || s.status === 'ESCALATED'
    );
    res.json({ activeEmergencyAlerts: activeSosList });
  });

  // ==========================================
  // 7. OPENROUTESERVICE ONLINE ROUTING API
  // ==========================================
  app.get('/api/v1/routing/directions', async (req, res) => {
    const start = req.query.start as string; // "lng,lat"
    const end = req.query.end as string;     // "lng,lat"

    if (!start || !end) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Missing start or end query parameter (format: "lng,lat")'
      });
    }

    const apiKey = (process.env.OPENROUTESERVICE_API_KEY || '').trim();

    try {
      // Call OpenRouteService Directions API v2
      const orsUrl = `https://api.heigit.org/openrouteservice/v2/directions/driving-car?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
      
      const response = await fetch(orsUrl, {
        headers: {
          'Authorization': apiKey,
          'Accept': 'application/json, application/geo+json'
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        let parsedErr: any = {};
        try {
          parsedErr = JSON.parse(errText);
        } catch (e) {
          parsedErr = { raw: errText };
        }

        const statusCode = response.status;
        const msg = parsedErr?.error?.message || `OpenRouteService HTTP ${statusCode}`;

        if (statusCode === 401 || statusCode === 403) {
          return res.status(statusCode).json({
            error: 'INVALID_API_KEY',
            message: 'Invalid OpenRouteService API Key. Please configure OPENROUTESERVICE_API_KEY in local.properties or environment.'
          });
        }

        if (statusCode === 429) {
          return res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'OpenRouteService API quota/rate limit exceeded. Please try again later.'
          });
        }

        return res.status(statusCode).json({
          error: 'ROUTING_FAILED',
          message: msg
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({
        error: 'NETWORK_FAILURE',
        message: err.message || 'Failed to connect to OpenRouteService server.'
      });
    }
  });

  // ==========================================
  // 8. GEMINI AI SAFETY GUIDE & SAFE ROUTE API
  // ==========================================
  app.post('/api/v1/ai/safety-guide', async (req, res) => {
    const { destination, language } = req.body;
    try {
      const dest = destination || 'Shimla';
      const reviews = db.getDestinationReviews(dest);
      let summary: DestinationReviewSummary | null = null;
      if (reviews.length > 0) {
        const totalReviews = reviews.length;
        const avgOverall = Number((reviews.reduce((s, r) => s + r.overallRating, 0) / totalReviews).toFixed(1));
        const avgSafety = Number((reviews.reduce((s, r) => s + r.safetyRating, 0) / totalReviews).toFixed(1));
        const avgDest = Number((reviews.reduce((s, r) => s + (r.destinationRating || 5), 0) / totalReviews).toFixed(1));
        const safetyIssueCount = reviews.filter(r => r.safetyIssueType && r.safetyIssueType !== 'No issues').length;
        const safeRouteCount = reviews.filter(r => r.routeFeltSafe === 'Yes' || r.routeFeltSafe === 'Not Applicable').length;
        const routeSafetyPercentage = Math.round((safeRouteCount / totalReviews) * 100);

        const expCounts = new Map<string, number>();
        for (const r of reviews) {
          for (const exp of r.destinationExperiences || []) {
            expCounts.set(exp, (expCounts.get(exp) || 0) + 1);
          }
        }
        const topExperiences = Array.from(expCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count);

        summary = {
          destination: dest,
          totalReviews,
          averageOverallRating: avgOverall,
          averageSafetyRating: avgSafety,
          averageDestinationRating: avgDest,
          safetyIssueCount,
          topExperiences,
          routeSafetyPercentage,
          recentReviews: []
        };
      }

      const guide = await generateDestinationSafetyGuide(dest, language || 'en', summary);
      res.json({ guide, reviewSummary: summary });
    } catch (err: any) {
      res.status(500).json({ error: 'AI_GUIDE_FAILED', message: err.message });
    }
  });

  app.post('/api/v1/ai/route-evaluation', async (req, res) => {
    const { origin, destination, transportMode } = req.body;
    try {
      const routes = await evaluateRouteSafety(
        origin || 'Chandigarh',
        destination || 'Shimla',
        transportMode || 'Car'
      );
      res.json({ evaluatedRoutes: routes });
    } catch (err: any) {
      res.status(500).json({ error: 'AI_ROUTE_FAILED', message: err.message });
    }
  });

  app.post('/api/v1/trips/:tripId/select-route', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { tripId } = req.params;
    const { selectedRoute } = req.body;

    const trip = db.trips.get(tripId);
    if (!trip || trip.leaderId !== user.id) {
      return res.status(403).json({ error: 'UNAUTHORIZED', message: 'Only Trip Leader can select the approved safe route.' });
    }

    trip.selectedRoute = selectedRoute;
    db.logAudit(user.id, user.name, 'SELECT_APPROVED_ROUTE', { tripId, routeName: selectedRoute.routeName });

    res.json({ trip, message: 'Approved route locked and cached for online & offline navigation.' });
  });

  // ==========================================
  // 8. NOTIFICATIONS & AUDIT API
  // ==========================================
  app.get('/api/v1/notifications', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const userNotifs = db.notifications.get(user.id) || [];
    res.json({ notifications: userNotifs });
  });

  app.post('/api/v1/notifications/:id/read', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { id } = req.params;
    const userNotifs = db.notifications.get(user.id) || [];
    const target = userNotifs.find(n => n.id === id);
    if (target) {
      target.isRead = true;
    }
    res.json({ success: true, notifications: userNotifs });
  });

  app.post('/api/v1/notifications/mark-all-read', authenticateFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const userNotifs = db.notifications.get(user.id) || [];
    userNotifs.forEach(n => { n.isRead = true; });
    res.json({ success: true, notifications: userNotifs });
  });

  app.get('/api/v1/audit-logs', (req, res) => {
    res.json({ auditLogs: db.auditLogs.slice(0, 30) });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
