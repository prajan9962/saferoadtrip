import { LocationCoordinates } from './locationService';
import { BoundaryStatus, LeaderLocationStatus } from '../types';

export type WebSocketConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';

export interface LeaderWebSocketData {
  user_id: string;
  leader_name: string;
  role: 'LEADER';
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: string | null;
  status: LeaderLocationStatus;
  isStale: boolean;
  ageSeconds: number;
  accuracySufficient?: boolean;
  uiState?: string;
  statusMessage?: string;
}

export interface MemberLocationUpdateEvent {
  type: 'member_location_update';
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
  distanceFromLeaderMeters: number;
  boundaryStatus: BoundaryStatus;
  leader: LeaderWebSocketData;
}

export interface InitialLocationsEvent {
  type: 'initial_locations';
  tripId: string;
  tripStatus: string;
  safeBubbleRadiusMeters: number;
  leader: LeaderWebSocketData;
  members: Array<{
    id: string;
    userId: string;
    userName: string;
    role: 'LEADER' | 'MEMBER';
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    timestamp: string | null;
    distanceFromLeaderMeters: number;
    boundaryStatus: BoundaryStatus;
    boundaryResponse?: 'I_AM_SAFE' | 'NEED_HELP' | null;
    freshness: 'LIVE' | 'STALE' | 'OFFLINE';
    ageSeconds: number;
    isStale: boolean;
  }>;
}

type EventCallback<T> = (data: T) => void;
type StatusCallback = (status: WebSocketConnectionStatus) => void;

export class LocationWebSocketClient {
  private ws: WebSocket | null = null;
  private currentTripId: string | null = null;
  private currentToken: string | null = null;
  private status: WebSocketConnectionStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectDelay = 10000;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isExplicitDisconnect = false;

  private statusListeners: Set<StatusCallback> = new Set();
  private updateListeners: Set<EventCallback<MemberLocationUpdateEvent>> = new Set();
  private initialListeners: Set<EventCallback<InitialLocationsEvent>> = new Set();

  public getStatus(): WebSocketConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === 'CONNECTED' && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public onMemberLocationUpdate(callback: EventCallback<MemberLocationUpdateEvent>): () => void {
    this.updateListeners.add(callback);
    return () => {
      this.updateListeners.delete(callback);
    };
  }

  public onInitialLocations(callback: EventCallback<InitialLocationsEvent>): () => void {
    this.initialListeners.add(callback);
    return () => {
      this.initialListeners.delete(callback);
    };
  }

  private setStatus(newStatus: WebSocketConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach(cb => {
        try {
          cb(newStatus);
        } catch (e) {
          console.warn('[LocationWS] Status listener error:', e);
        }
      });
    }
  }

  public connect(tripId: string, token: string) {
    if (this.ws && this.currentTripId === tripId && this.currentToken === token && (this.status === 'CONNECTED' || this.status === 'CONNECTING')) {
      return;
    }

    this.disconnect();
    this.isExplicitDisconnect = false;
    this.currentTripId = tripId;
    this.currentToken = token;
    this.reconnectAttempts = 0;

    this.initiateSocket();
  }

  private initiateSocket() {
    if (!this.currentTripId || !this.currentToken || this.isExplicitDisconnect) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/ws/locations?tripId=${encodeURIComponent(this.currentTripId)}&token=${encodeURIComponent(this.currentToken)}`;

    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
        console.log(`[SafeRoad+ LocationWS] Connected to real-time location stream for trip: ${this.currentTripId}`);

        // Keep-alive ping interval every 25 seconds
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'member_location_update') {
            this.updateListeners.forEach(cb => {
              try {
                cb(data as MemberLocationUpdateEvent);
              } catch (e) {
                console.warn('[LocationWS] Update callback error:', e);
              }
            });
          } else if (data.type === 'initial_locations') {
            this.initialListeners.forEach(cb => {
              try {
                cb(data as InitialLocationsEvent);
              } catch (e) {
                console.warn('[LocationWS] Initial callback error:', e);
              }
            });
          }
        } catch (err) {
          console.warn('[SafeRoad+ LocationWS] Parse message error:', err);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.isExplicitDisconnect) {
          this.setStatus('DISCONNECTED');
          return;
        }

        console.warn(`[SafeRoad+ LocationWS] Connection closed (code ${event.code}). Scheduling reconnection...`);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error: Event) => {
        console.warn('[SafeRoad+ LocationWS] WebSocket encountered an error:', error);
      };
    } catch (err) {
      console.warn('[SafeRoad+ LocationWS] Failed to instantiate WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitDisconnect || !this.currentTripId || !this.currentToken) {
      this.setStatus('DISCONNECTED');
      return;
    }

    this.setStatus('RECONNECTING');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 4s, 8s, capped at 10s
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);

    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitDisconnect) {
        this.initiateSocket();
      }
    }, delay);
  }

  public sendLocationUpdate(coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    heading?: number | null;
    speed?: number | null;
    timestamp?: string;
  }): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'location_update',
          ...coords
        }));
        return true;
      } catch (err) {
        console.warn('[SafeRoad+ LocationWS] Error sending location update via WebSocket:', err);
      }
    }
    return false;
  }

  public disconnect() {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client Disconnect');
      } catch {}
      this.ws = null;
    }
    this.currentTripId = null;
    this.currentToken = null;
    this.setStatus('DISCONNECTED');
  }
}

export const locationWebSocketClient = new LocationWebSocketClient();
