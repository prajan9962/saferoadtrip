import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { db, TripMemberLocation } from './database';
import { evaluateDynamicSafeBubble, getLeaderLocationStatus } from './geofenceService';
import { GEOFENCE_CONFIG } from '../src/config/geofenceConfig';
import { UserProfile, Trip, TripMember, BoundaryStatus } from '../src/types';

export interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: string;
}

interface TripClient {
  ws: WebSocket;
  userId: string;
  userName: string;
  tripId: string;
  role: 'LEADER' | 'MEMBER';
}

class LocationWebSocketService {
  private wss: WebSocketServer | null = null;
  // tripId -> Set of connected client sockets
  private tripClients: Map<string, Set<TripClient>> = new Map();

  public initialize(server: HttpServer) {
    this.wss = new WebSocketServer({
      server,
      path: '/api/v1/ws/locations'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    console.log('[SafeRoad+ LocationWS] WebSocket server initialized on path /api/v1/ws/locations');
  }

  private handleConnection(ws: WebSocket, req: any) {
    try {
      const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost:3000'}`);
      const tripId = parsedUrl.searchParams.get('tripId');
      const token = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('idToken') || parsedUrl.searchParams.get('userId');

      if (!tripId || !token) {
        ws.send(JSON.stringify({ type: 'error', code: 'UNAUTHORIZED', message: 'Missing tripId or token parameters' }));
        ws.close(4001, 'Unauthorized');
        return;
      }

      // Authenticate user
      const user = this.resolveUser(token);
      if (!user) {
        ws.send(JSON.stringify({ type: 'error', code: 'UNAUTHORIZED', message: 'Invalid authentication token' }));
        ws.close(4003, 'Unauthorized User');
        return;
      }

      // Authorize trip membership
      const trip = db.trips.get(tripId);
      if (!trip || trip.isArchived) {
        ws.send(JSON.stringify({ type: 'error', code: 'TRIP_NOT_FOUND', message: 'Active trip not found' }));
        ws.close(4004, 'Trip Not Found');
        return;
      }

      const members = db.tripMembers.get(tripId) || [];
      const isLeader = trip.leaderId === user.id;
      const member = members.find(m => m.userId === user.id);

      if (!isLeader && (!member || member.status !== 'APPROVED')) {
        ws.send(JSON.stringify({ type: 'error', code: 'FORBIDDEN', message: 'You are not an approved member of this trip' }));
        ws.close(4003, 'Forbidden');
        return;
      }

      const clientRole: 'LEADER' | 'MEMBER' = isLeader ? 'LEADER' : 'MEMBER';
      const client: TripClient = {
        ws,
        userId: user.id,
        userName: user.name,
        tripId,
        role: clientRole
      };

      if (!this.tripClients.has(tripId)) {
        this.tripClients.set(tripId, new Set());
      }
      this.tripClients.get(tripId)!.add(client);

      console.log(`[SafeRoad+ LocationWS] Client connected: ${user.name} (${clientRole}) -> Trip: ${tripId} (Active sockets: ${this.tripClients.get(tripId)!.size})`);

      // 1. Send initial full snapshot of trip members and leader locations
      const initialPayload = this.getTripLocationsPayload(tripId);
      ws.send(JSON.stringify({
        type: 'initial_locations',
        ...initialPayload
      }));

      // 2. Handle incoming location updates
      ws.on('message', (messageBuffer: Buffer | string) => {
        try {
          const messageStr = messageBuffer.toString();
          const data = JSON.parse(messageStr);

          if (data.type === 'location_update') {
            // Process genuine GPS fix using authenticated user identity from socket session
            this.processLocationUpdate(tripId, user, {
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              accuracy: data.accuracy !== undefined ? Number(data.accuracy) : 10,
              altitude: data.altitude !== undefined ? Number(data.altitude) : null,
              heading: data.heading !== undefined ? Number(data.heading) : null,
              speed: data.speed !== undefined ? Number(data.speed) : null,
              timestamp: data.timestamp || new Date().toISOString()
            });
          } else if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (msgErr: any) {
          console.warn('[SafeRoad+ LocationWS] Failed to process incoming WS message:', msgErr?.message);
        }
      });

      // 3. Handle disconnection
      ws.on('close', () => {
        const clients = this.tripClients.get(tripId);
        if (clients) {
          clients.delete(client);
          if (clients.size === 0) {
            this.tripClients.delete(tripId);
          }
        }
        console.log(`[SafeRoad+ LocationWS] Client disconnected: ${user.name} from Trip: ${tripId}`);
      });

      ws.on('error', (err) => {
        console.warn(`[SafeRoad+ LocationWS] Socket error for ${user.name}:`, err.message);
      });
    } catch (err: any) {
      console.warn('[SafeRoad+ LocationWS] Connection handler warning:', err.message);
      try {
        ws.close(4000, 'Server Error');
      } catch {}
    }
  }

  private resolveUser(token: string): UserProfile | null {
    // 1. Direct match by ID
    const byId = db.users.get(token);
    if (byId) return byId;

    // 2. Match by Firebase UID
    const byUidKey = db.firebaseUidToUserId.get(token);
    if (byUidKey && db.users.has(byUidKey)) {
      return db.users.get(byUidKey)!;
    }

    // 3. Scan users map
    const byScan = Array.from(db.users.values()).find(u => u.firebaseUid === token || u.id === token);
    return byScan || null;
  }

  /**
   * Processes a location update for an authenticated user, recalculates geofencing,
   * stores the latest location, and broadcasts the event to all trip participants.
   */
  public processLocationUpdate(tripId: string, user: UserProfile, payload: LocationPayload) {
    const trip = db.trips.get(tripId);
    if (!trip || trip.status === 'COMPLETED' || trip.status === 'CANCELLED' || trip.isArchived) {
      return null;
    }

    const members = db.tripMembers.get(tripId) || [];
    const isLeader = trip.leaderId === user.id;
    const member = members.find(m => m.userId === user.id);

    if (!isLeader && (!member || member.status !== 'APPROVED')) {
      return null;
    }

    const now = payload.timestamp || new Date().toISOString();
    const latNum = Number(payload.latitude);
    const lngNum = Number(payload.longitude);
    const accuracyNum = payload.accuracy !== undefined ? Number(payload.accuracy) : 10;

    if (isNaN(latNum) || isNaN(lngNum)) {
      return null;
    }

    // 1. Update trip member location store
    let tripLocMap = db.tripMemberLocations.get(tripId);
    if (!tripLocMap) {
      tripLocMap = new Map();
      db.tripMemberLocations.set(tripId, tripLocMap);
    }

    const locationRecord: TripMemberLocation = {
      id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tripId,
      userId: user.id,
      userName: user.name,
      role: isLeader ? 'LEADER' : 'MEMBER',
      latitude: latNum,
      longitude: lngNum,
      accuracy: accuracyNum,
      altitude: payload.altitude ?? null,
      heading: payload.heading ?? null,
      speed: payload.speed ?? null,
      timestamp: now,
      createdAt: now,
      updatedAt: now
    };

    // Update in-memory member object
    if (member) {
      member.lastLatitude = latNum;
      member.lastLongitude = lngNum;
      member.accuracyMeters = accuracyNum;
      member.lastLocationUpdate = now;
    }

    if (isLeader) {
      // Leader GPS update -> Leader is the perimeter reference center
      trip.leaderLatitude = latNum;
      trip.leaderLongitude = lngNum;
      trip.leaderAccuracyMeters = accuracyNum;
      trip.leaderLastLocationUpdate = now;

      locationRecord.distanceFromLeaderMeters = 0;
      locationRecord.boundaryStatus = 'INSIDE_BUBBLE';
      if (member) {
        member.boundaryStatus = 'INSIDE_BUBBLE';
        member.distanceFromLeaderMeters = 0;
      }

      tripLocMap.set(user.id, locationRecord);
      db.latestLeaderLocations.set(tripId, locationRecord);

      // Recalculate dynamic distance & boundary for all approved members
      for (const m of members) {
        if (m.userId === trip.leaderId || m.status !== 'APPROVED') continue;
        const prevStatus = m.boundaryStatus || 'INSIDE_BUBBLE';
        const evalResult = evaluateDynamicSafeBubble(m, trip);
        m.boundaryStatus = evalResult.boundaryStatus;
        m.distanceFromLeaderMeters = evalResult.distanceMeters;

        // Update member record in location map
        const existingMemLoc = tripLocMap.get(m.userId);
        if (existingMemLoc) {
          existingMemLoc.distanceFromLeaderMeters = evalResult.distanceMeters;
          existingMemLoc.boundaryStatus = evalResult.boundaryStatus;
        }

        // State transition: ONLY trigger alert when crossing from INSIDE -> OUTSIDE (or after debounce)
        if (evalResult.shouldAlert && evalResult.isOutside && prevStatus !== 'OUTSIDE_BUBBLE') {
          this.triggerBoundaryAlert(trip, m, evalResult.distanceMeters, now);
        }
      }
    } else {
      // Member GPS update -> Evaluate relative to current Leader coordinates
      const prevStatus = member?.boundaryStatus || 'INSIDE_BUBBLE';
      const evalResult = member ? evaluateDynamicSafeBubble(member, trip) : null;

      if (member && evalResult) {
        member.boundaryStatus = evalResult.boundaryStatus;
        member.distanceFromLeaderMeters = evalResult.distanceMeters;
        locationRecord.distanceFromLeaderMeters = evalResult.distanceMeters;
        locationRecord.boundaryStatus = evalResult.boundaryStatus;
        locationRecord.boundaryResponse = member.boundaryResponse || null;

        // State transition check: trigger notification only when crossing from INSIDE -> OUTSIDE
        if (evalResult.shouldAlert && evalResult.isOutside && prevStatus !== 'OUTSIDE_BUBBLE') {
          this.triggerBoundaryAlert(trip, member, evalResult.distanceMeters, now);
        }
      }

      tripLocMap.set(user.id, locationRecord);
    }

    // Store in capped historical audit list (max 500 records)
    db.locationHistory.push(locationRecord);
    if (db.locationHistory.length > 500) {
      db.locationHistory.shift();
    }

    // 2. Broadcast location update event over WebSockets to all connected clients for this trip
    const leaderStatus = getLeaderLocationStatus(trip);
    const broadcastEvent = {
      type: 'member_location_update',
      trip_id: tripId,
      tripId,
      user_id: user.id,
      userId: user.id,
      user_name: user.name,
      userName: user.name,
      role: locationRecord.role,
      latitude: latNum,
      longitude: lngNum,
      accuracy: accuracyNum,
      altitude: payload.altitude ?? null,
      heading: payload.heading ?? null,
      speed: payload.speed ?? null,
      timestamp: now,
      distanceFromLeaderMeters: locationRecord.distanceFromLeaderMeters ?? 0,
      boundaryStatus: locationRecord.boundaryStatus ?? 'INSIDE_BUBBLE',
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
        uiState: leaderStatus.uiState,
        statusMessage: leaderStatus.statusMessage
      }
    };

    this.broadcastToTrip(tripId, broadcastEvent);

    return {
      locationRecord,
      trip,
      members: members.filter(m => m.status === 'APPROVED')
    };
  }

  private triggerBoundaryAlert(trip: Trip, member: TripMember, distanceMeters: number, timestamp: string) {
    // 1. Trigger alert to Trip Leader
    const leaderNotifs = db.notifications.get(trip.leaderId) || [];
    const alreadyNotifiedLeader = leaderNotifs.some(
      n => n.type === 'BOUNDARY_ALERT' && n.message.includes(member.userName) && !n.isRead
    );

    if (!alreadyNotifiedLeader) {
      leaderNotifs.unshift({
        id: 'notif_' + Math.random().toString(36).substring(2, 9),
        userId: trip.leaderId,
        tripId: trip.id,
        type: 'BOUNDARY_ALERT',
        title: `⚠️ BOUNDARY ALERT: ${member.userName} Outside Safe Bubble`,
        message: `${member.userName} is ${distanceMeters}m away from the Trip Leader (Safe Bubble radius: ${trip.safeBubbleRadiusMeters}m).`,
        isRead: false,
        createdAt: timestamp
      });
      db.notifications.set(trip.leaderId, leaderNotifs);
    }

    // 2. Trigger alert to Member
    const memberNotifs = db.notifications.get(member.userId) || [];
    const alreadyNotifiedMember = memberNotifs.some(n => n.type === 'BOUNDARY_ALERT' && !n.isRead);

    if (!alreadyNotifiedMember) {
      memberNotifs.unshift({
        id: 'notif_' + Math.random().toString(36).substring(2, 9),
        userId: member.userId,
        tripId: trip.id,
        type: 'BOUNDARY_ALERT',
        title: '⚠️ BOUNDARY ALERT: Outside Safe Bubble',
        message: `You are ${distanceMeters}m from Trip Leader ${trip.leaderName}. Respond "I'm Safe" or "Need Help".`,
        isRead: false,
        createdAt: timestamp
      });
      db.notifications.set(member.userId, memberNotifs);
    }
  }

  public getTripLocationsPayload(tripId: string) {
    const trip = db.trips.get(tripId);
    if (!trip) {
      return { tripId, members: [], leader: null };
    }

    const members = db.tripMembers.get(tripId) || [];
    const leaderStatus = getLeaderLocationStatus(trip);

    const approvedMembers = members.filter(m => m.status === 'APPROVED');
    const now = Date.now();

    const formattedMembers = approvedMembers.map(m => {
      const isLeader = m.userId === trip.leaderId;
      const lastUpdateMs = m.lastLocationUpdate ? new Date(m.lastLocationUpdate).getTime() : null;
      const ageSeconds = lastUpdateMs ? Math.max(0, Math.floor((now - lastUpdateMs) / 1000)) : 999999;
      const freshness: 'LIVE' | 'STALE' | 'OFFLINE' =
        ageSeconds <= 15 ? 'LIVE' : ageSeconds <= 60 ? 'STALE' : 'OFFLINE';

      return {
        id: m.id,
        user_id: m.userId,
        userId: m.userId,
        user_name: m.userName,
        userName: m.userName,
        role: m.role,
        latitude: isLeader ? (trip.leaderLatitude ?? null) : (m.lastLatitude ?? null),
        longitude: isLeader ? (trip.leaderLongitude ?? null) : (m.lastLongitude ?? null),
        accuracy: isLeader ? (trip.leaderAccuracyMeters ?? null) : (m.accuracyMeters ?? null),
        timestamp: isLeader ? (trip.leaderLastLocationUpdate ?? null) : (m.lastLocationUpdate ?? null),
        distanceFromLeaderMeters: isLeader ? 0 : (m.distanceFromLeaderMeters ?? 0),
        boundaryStatus: isLeader ? 'INSIDE_BUBBLE' : (m.boundaryStatus ?? 'INSIDE_BUBBLE'),
        boundaryResponse: m.boundaryResponse || null,
        freshness,
        ageSeconds,
        isStale: ageSeconds > 15
      };
    });

    return {
      tripId: trip.id,
      tripStatus: trip.status,
      safeBubbleRadiusMeters: trip.safeBubbleRadiusMeters || GEOFENCE_CONFIG.SAFE_BUBBLE_RADIUS_METERS,
      leader: {
        user_id: trip.leaderId,
        userId: trip.leaderId,
        leader_name: trip.leaderName,
        userName: trip.leaderName,
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
        statusMessage: leaderStatus.statusMessage
      },
      members: formattedMembers
    };
  }

  public broadcastToTrip(tripId: string, eventData: any) {
    const clients = this.tripClients.get(tripId);
    if (!clients || clients.size === 0) return;

    const payloadStr = JSON.stringify(eventData);
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(payloadStr);
        } catch (err) {
          console.warn(`[SafeRoad+ LocationWS] Failed to send WS update to ${client.userName}:`, err);
        }
      }
    });
  }

  public getConnectedClientsCount(tripId: string): number {
    return this.tripClients.get(tripId)?.size || 0;
  }
}

export const locationWebSocketService = new LocationWebSocketService();
