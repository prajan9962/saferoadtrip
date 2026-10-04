import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TripManagement } from './components/TripManagement';
import { TripChat } from './components/TripChat';
import { SafeBubbleMonitor } from './components/SafeBubbleMonitor';
import { SosEmergencyModal } from './components/SosEmergencyModal';
import { AiSafetyGuideView } from './components/AiSafetyGuideView';
import { OfflineBleSimulator } from './components/OfflineBleSimulator';
import { UserProfileView } from './components/UserProfileView';
import { EmergencyContactScreen } from './components/EmergencyContactScreen';
import { EmergencyContactSetupModal } from './components/EmergencyContactSetupModal';
import { AuthorityDashboard } from './components/AuthorityDashboard';
import { AuditLogsView } from './components/AuditLogsView';
import { SafeRoadMapScreen } from './components/SafeRoadMapScreen';
import { SosTestSuite } from './components/SosTestSuite';
import { LoginScreen } from './components/LoginScreen';
import { auth, onAuthStateChanged, signOut } from './lib/firebase';
import { Loader2, ShieldAlert, AlertCircle } from 'lucide-react';
import { locationTrackingService } from './utils/locationService';
import { locationWebSocketClient, MemberLocationUpdateEvent, InitialLocationsEvent } from './utils/locationWebSocket';

import {
  UserProfile,
  Trip,
  TripMember,
  SOSRecord,
  NotificationItem,
  VerifiedHotel,
  SafeRouteOption,
  AIDestinationSafetyGuide,
  TripState,
  AuthorityType,
  EmergencyContact
} from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: '',
    firebaseUid: '',
    email: '',
    phone: '',
    name: '',
    age: 0,
    gender: '',
    preferredLanguage: 'en',
    medicalInfo: {
      emergencyContactName: '',
      emergencyContactPhone: '',
      bloodGroup: '',
      medicalConditions: '',
      allergies: ''
    }
  });
  const [activeTab, setActiveTab] = useState<string>('map');
  const [tripSubTab, setTripSubTab] = useState<'sos' | 'current' | 'create' | 'join' | 'completed'>('current');

  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeSos, setActiveSos] = useState<SOSRecord | null>(null);
  const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false);
  const [isContactSetupModalOpen, setIsContactSetupModalOpen] = useState<boolean>(false);

  // Monitor Firebase Auth state persistence across app reopens/reloads
  useEffect(() => {
    // 1. Instant check for cached authenticated user session
    const cachedUser = localStorage.getItem('saferoad_auth_session');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed && parsed.firebaseUid) {
          setCurrentUser(parsed);
          setUsers(prev => {
            const exists = prev.some(u => u.firebaseUid === parsed.firebaseUid);
            return exists ? prev.map(u => u.firebaseUid === parsed.firebaseUid ? { ...u, ...parsed } : u) : [parsed, ...prev];
          });
          setIsAuthenticated(true);
          setIsAuthChecking(false);
        }
      } catch (err) {
        console.warn('Could not restore cached session:', err);
      }
    }

    // 2. Firebase onAuthStateChanged listener
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Authenticate with backend and fetch user's real persisted profile
        try {
          const authRes = await fetch('/api/v1/auth/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: fbUser.uid })
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            const serverUser: UserProfile = {
              ...authData.user,
              name: fbUser.displayName || authData.user.name,
              email: fbUser.email || authData.user.email,
              photoURL: fbUser.photoURL || undefined
            };
            setCurrentUser(serverUser);
            localStorage.setItem('saferoad_auth_session', JSON.stringify(serverUser));
            setUsers(prev => {
              const exists = prev.some(u => u.firebaseUid === fbUser.uid);
              return exists ? prev.map(u => u.firebaseUid === fbUser.uid ? { ...u, ...serverUser } : u) : [serverUser, ...prev];
            });
            setIsAuthenticated(true);
          }
        } catch (e) {
          console.warn('Auth sync error:', e);
          const fallbackProfile: UserProfile = {
            id: fbUser.uid,
            firebaseUid: fbUser.uid,
            email: fbUser.email || 'traveler@saferoad.org',
            phone: '',
            name: fbUser.displayName || 'SafeRoad Traveler',
            photoURL: fbUser.photoURL || undefined,
            age: 28,
            gender: 'Specified in Profile',
            preferredLanguage: 'en',
            medicalInfo: {
              emergencyContactName: '',
              emergencyContactPhone: '',
              bloodGroup: 'Not Specified',
              medicalConditions: 'None reported',
              allergies: 'None reported'
            }
          };
          setCurrentUser(fallbackProfile);
          setIsAuthenticated(true);
        }
      } else {
        if (!localStorage.getItem('saferoad_auth_session')) {
          setIsAuthenticated(false);
        }
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = async (user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }) => {
    locationTrackingService.clearSession();
    try {
      const authRes = await fetch('/api/v1/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: user.uid })
      });
      if (authRes.ok) {
        const authData = await authRes.json();
        const serverUser: UserProfile = {
          ...authData.user,
          name: user.displayName || authData.user.name,
          email: user.email || authData.user.email,
          photoURL: user.photoURL
        };
        setCurrentUser(serverUser);
        localStorage.setItem('saferoad_auth_session', JSON.stringify(serverUser));
        setUsers(prev => {
          const exists = prev.some(u => u.firebaseUid === user.uid);
          return exists ? prev.map(u => u.firebaseUid === user.uid ? { ...u, ...serverUser } : u) : [serverUser, ...prev];
        });
      }
    } catch (err) {
      console.error('Error logging in:', err);
    }
    setIsAuthenticated(true);
    setActiveTab('map');
  };

  const handleLogout = async () => {
    locationTrackingService.clearSession();
    setActiveTrip(null);
    setTripMembers([]);
    setActiveSos(null);
    setNotifications([]);
    try {
      localStorage.removeItem('saferoad_auth_session');
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsAuthenticated(false);
    }
  };

  // Fetch active trip, notifications, and profile for current user
  const fetchUserData = async () => {
    if (!currentUser.firebaseUid) return;
    try {
      // 1. Fetch user profile & emergency contact
      const userRes = await fetch('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
      });
      if (userRes.ok && userRes.headers.get('content-type')?.includes('application/json')) {
        const userData = await userRes.json();
        if (userData.user) {
          setCurrentUser(prev => ({
            ...prev,
            ...userData.user
          }));
        }
      }

      // 2. Fetch active trip
      const tripRes = await fetch('/api/v1/trips/active', {
        headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
      });
      if (tripRes.ok && tripRes.headers.get('content-type')?.includes('application/json')) {
        const tripData = await tripRes.json();
        setActiveTrip(tripData.activeTrip || null);
        setTripMembers(tripData.members || []);

        // 2b. If active trip exists, fetch active SOS for the trip
        if (tripData.activeTrip) {
          try {
            const sosRes = await fetch(`/api/v1/trips/${tripData.activeTrip.id}/active-sos`, {
              headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
            });
            if (sosRes.ok && sosRes.headers.get('content-type')?.includes('application/json')) {
              const sosData = await sosRes.json();
              setActiveSos(sosData.activeSos || null);
            }
          } catch (sErr) {
            console.warn('[Active SOS sync error]', sErr);
          }
        }
      }

      // 3. Fetch notifications
      const notifRes = await fetch('/api/v1/notifications', {
        headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
      });
      if (notifRes.ok && notifRes.headers.get('content-type')?.includes('application/json')) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }
    } catch (e) {
      console.warn('Sync user data non-fatal warning:', e);
    }
  };

  // Register / sync FCM token for current user
  useEffect(() => {
    if (currentUser.firebaseUid) {
      const registerDeviceFcmToken = async () => {
        try {
          const deviceToken = currentUser.fcmToken || `fcm_device_${currentUser.id}_${Date.now()}`;
          await fetch('/api/v1/users/me/fcm-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${currentUser.firebaseUid}`
            },
            body: JSON.stringify({
              fcmToken: deviceToken,
              deviceId: `device_${currentUser.id}`,
              platform: 'Android/Web'
            })
          });
        } catch (fErr) {
          console.warn('[FCM token registration warn]', fErr);
        }
      };
      registerDeviceFcmToken();
    }
  }, [currentUser.id, currentUser.firebaseUid]);

  // Initial user data fetch & real-time polling every 3 seconds
  useEffect(() => {
    if (currentUser.firebaseUid) {
      fetchUserData();
      const interval = setInterval(fetchUserData, 3000);
      return () => clearInterval(interval);
    }
  }, [currentUser.firebaseUid]);

  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<'GRANTED' | 'DENIED' | 'PROMPT'>('GRANTED');
  const [gpsServicesStatus, setGpsServicesStatus] = useState<'ON' | 'OFF'>('ON');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check GPS permission state
  useEffect(() => {
    locationTrackingService.queryPermissionState().then(status => {
      setGpsPermissionStatus(status);
    });
  }, []);

  // Real-time WebSocket connection & continuous GPS tracking for active trips
  useEffect(() => {
    if (activeTrip && activeTrip.status === 'ACTIVE' && currentUser.firebaseUid) {
      const isLeader = activeTrip.leaderId === currentUser.id;

      // 1. Establish full-duplex WebSocket stream
      locationWebSocketClient.connect(activeTrip.id, currentUser.firebaseUid);

      const unsubInitial = locationWebSocketClient.onInitialLocations((data: InitialLocationsEvent) => {
        if (data.tripId === activeTrip.id) {
          if (data.leader) {
            setActiveTrip(prev => {
              if (!prev) return null;
              return {
                ...prev,
                leaderLatitude: data.leader.latitude,
                leaderLongitude: data.leader.longitude,
                leaderAccuracyMeters: data.leader.accuracy ?? prev.leaderAccuracyMeters,
                leaderLastLocationUpdate: data.leader.timestamp ?? prev.leaderLastLocationUpdate,
                safeBubbleRadiusMeters: data.safeBubbleRadiusMeters || prev.safeBubbleRadiusMeters
              };
            });
          }
          if (data.members) {
            setTripMembers(prev => {
              const map = new Map<string, TripMember>(prev.map(m => [m.userId, m]));
              data.members.forEach(item => {
                const existing = map.get(item.userId);
                if (existing) {
                  map.set(item.userId, {
                    ...existing,
                    lastLatitude: item.latitude ?? existing.lastLatitude,
                    lastLongitude: item.longitude ?? existing.lastLongitude,
                    accuracyMeters: item.accuracy ?? existing.accuracyMeters,
                    lastLocationUpdate: item.timestamp ?? existing.lastLocationUpdate,
                    distanceFromLeaderMeters: item.distanceFromLeaderMeters,
                    boundaryStatus: item.boundaryStatus,
                    boundaryResponse: item.boundaryResponse ?? existing.boundaryResponse
                  });
                }
              });
              return Array.from(map.values());
            });
          }
        }
      });

      const unsubUpdate = locationWebSocketClient.onMemberLocationUpdate((evt: MemberLocationUpdateEvent) => {
        if (evt.tripId === activeTrip.id) {
          // Update Leader position if event contains leader data or if event is from leader
          if (evt.leader) {
            setActiveTrip(prev => {
              if (!prev) return null;
              return {
                ...prev,
                leaderLatitude: evt.leader.latitude,
                leaderLongitude: evt.leader.longitude,
                leaderAccuracyMeters: evt.leader.accuracy ?? prev.leaderAccuracyMeters,
                leaderLastLocationUpdate: evt.leader.timestamp ?? prev.leaderLastLocationUpdate
              };
            });
          }

          // Update member in place without page reload
          setTripMembers(prev =>
            prev.map(m => {
              if (m.userId === evt.userId) {
                return {
                  ...m,
                  lastLatitude: evt.latitude,
                  lastLongitude: evt.longitude,
                  accuracyMeters: evt.accuracy,
                  lastLocationUpdate: evt.timestamp,
                  distanceFromLeaderMeters: evt.distanceFromLeaderMeters,
                  boundaryStatus: evt.boundaryStatus
                };
              }
              return m;
            })
          );
        }
      });

      // 2. Start high-accuracy device GPS tracking
      locationTrackingService.startActiveTripTracking(
        activeTrip.id,
        isLeader,
        (coords) => {
          handleEmitLocation(coords.latitude, coords.longitude, coords.accuracy, coords.altitude, coords.heading, coords.speed);
        },
        (err) => {
          if ('code' in err) {
            const geoErr = err as GeolocationPositionError;
            if (geoErr.code === geoErr.PERMISSION_DENIED) {
              setGpsPermissionStatus('DENIED');
            } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
              setGpsServicesStatus('OFF');
            }
          }
        }
      );

      return () => {
        unsubInitial();
        unsubUpdate();
        locationTrackingService.stopActiveTripTracking();
        locationWebSocketClient.disconnect();
      };
    } else {
      locationTrackingService.stopActiveTripTracking();
      locationWebSocketClient.disconnect();
    }
  }, [activeTrip?.id, activeTrip?.status, currentUser.id, currentUser.firebaseUid]);

  const handleRequestEnableLocation = async () => {
    try {
      const coords = await locationTrackingService.getCurrentPosition();
      setGpsPermissionStatus('GRANTED');
      setGpsServicesStatus('ON');
      await handleEmitLocation(coords.latitude, coords.longitude, coords.accuracy);
    } catch (err: any) {
      if (err?.code === 1) {
        setGpsPermissionStatus('DENIED');
      }
    }
  };

  const handleSwitchUser = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      locationTrackingService.clearSession();
      setActiveTrip(null);
      setTripMembers([]);
      setActiveSos(null);
      setNotifications([]);
      setCurrentUser(target);
    }
  };

  // Emergency Contact Management
  const handleSaveEmergencyContact = async (contactData: Partial<EmergencyContact>) => {
    const res = await fetch('/api/v1/users/me/emergency-contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify(contactData)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to save emergency contact');

    const updatedUser = {
      ...currentUser,
      emergencyContact: result.emergencyContact,
      medicalInfo: {
        ...currentUser.medicalInfo,
        emergencyContactName: result.emergencyContact.name,
        emergencyContactPhone: result.emergencyContact.phone
      }
    };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    localStorage.setItem('saferoad_auth_session', JSON.stringify(updatedUser));
  };

  const handleRemoveEmergencyContact = async () => {
    const res = await fetch('/api/v1/users/me/emergency-contact', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${currentUser.firebaseUid}`
      }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to remove emergency contact');

    const updatedUser = {
      ...currentUser,
      emergencyContact: undefined,
      medicalInfo: {
        ...currentUser.medicalInfo,
        emergencyContactName: '',
        emergencyContactPhone: ''
      }
    };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    localStorage.setItem('saferoad_auth_session', JSON.stringify(updatedUser));
  };

  // 1. Trip Actions
  const handleCreateTrip = async (data: any) => {
    const res = await fetch('/api/v1/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to create trip');
    await fetchUserData();
  };

  const handleJoinTrip = async (tripCode: string) => {
    if (!tripCode || !tripCode.trim()) {
      throw new Error('Please enter a valid 6-character Trip Code.');
    }
    const normalizedCode = tripCode.trim().toUpperCase();

    const res = await fetch('/api/v1/trips/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify({ tripCode: normalizedCode })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to join trip');
    await fetchUserData();
  };

  const handleUpdateTripState = async (newState: TripState) => {
    if (!activeTrip) return;
    const res = await fetch(`/api/v1/trips/${activeTrip.id}/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify({ newState })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }
    await fetchUserData();
  };

  const handleTransferLeadership = async (newLeaderUserId: string) => {
    if (!activeTrip) return;
    const res = await fetch(`/api/v1/trips/${activeTrip.id}/transfer-leadership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify({ newLeaderUserId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }
    await fetchUserData();
  };

  const handleArchiveTrip = async () => {
    if (!activeTrip) return;
    const res = await fetch(`/api/v1/trips/${activeTrip.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }
    await fetchUserData();
  };

  const handleSearchHotels = async (destination: string, query?: string): Promise<VerifiedHotel[]> => {
    const url = `/api/v1/places/hotels?destination=${encodeURIComponent(destination)}${query ? '&query=' + encodeURIComponent(query) : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.verifiedHotels || [];
  };

  const handleGetAiHotelRecommendations = async (
    destination: string,
    preferences?: { budgetTier?: string; groupSize?: number; priority?: string },
    queryHotelName?: string
  ): Promise<VerifiedHotel[]> => {
    const res = await fetch('/api/v1/ai/hotel-recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, preferences, queryHotelName })
    });
    const data = await res.json();
    return data.hotels || [];
  };

  // 2. GPS & Geofencing - Real-Time Multi-User GPS Stream
  const handleEmitLocation = async (
    latitude: number,
    longitude: number,
    accuracy?: number,
    altitude?: number | null,
    heading?: number | null,
    speed?: number | null
  ) => {
    if (!activeTrip) return;

    const locPayload = {
      latitude,
      longitude,
      accuracy: accuracy || 8,
      altitude: altitude ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
      timestamp: new Date().toISOString()
    };

    // Primary: Send instantaneously over low-latency WebSocket channel
    const sentViaWs = locationWebSocketClient.sendLocationUpdate(locPayload);

    if (sentViaWs) {
      locationTrackingService.setBackendSyncStatus(true);
      return;
    }

    // Fallback: If WebSocket is connecting or offline, send via standard REST endpoint
    try {
      const res = await fetch(`/api/v1/trips/${activeTrip.id}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.firebaseUid}`
        },
        body: JSON.stringify(locPayload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trip) {
          setActiveTrip(prev => prev ? { ...prev, ...data.trip } : null);
        }
        if (data.members) {
          setTripMembers(data.members);
        }
        locationTrackingService.setBackendSyncStatus(true);
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn('Location emit error:', err.message);
        locationTrackingService.setBackendSyncStatus(false);
      }
    } catch (err) {
      console.warn('Location emit network error:', err);
      locationTrackingService.setBackendSyncStatus(false);
    }
  };

  const handleUpdateBubbleRadius = async (radiusMeters: number) => {
    if (!activeTrip) return;
    const res = await fetch(`/api/v1/trips/${activeTrip.id}/bubble-radius`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify({ radiusMeters })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }
    await fetchUserData();
  };

  const handleBoundaryResponse = async (alertId: string, response: 'CONFIRM_SAFE' | 'REQUEST_ASSISTANCE') => {
    const res = await fetch(`/api/v1/bubble/alerts/${alertId}/response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify({ response })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }
    await fetchUserData();
  };

  // 3. SOS Emergency Handlers with step logging
  const handleInitiateSos = async (
    locationOrLat?: { latitude: number; longitude: number; accuracy?: number } | number,
    maybeLng?: number,
    accuracyOrOffline?: number | boolean
  ) => {
    console.log('[SafeRoad SOS Dev Log] SOS button pressed');
    console.log('[SafeRoad SOS Dev Log] SOS countdown started');

    let lat: number | null = null;
    let lng: number | null = null;
    let accuracy = 10;

    if (typeof locationOrLat === 'object' && locationOrLat !== null) {
      if (typeof locationOrLat.latitude === 'number' && typeof locationOrLat.longitude === 'number') {
        lat = locationOrLat.latitude;
        lng = locationOrLat.longitude;
        accuracy = locationOrLat.accuracy ?? 10;
      }
    } else if (typeof locationOrLat === 'number') {
      lat = locationOrLat;
      if (typeof maybeLng === 'number') lng = maybeLng;
      if (typeof accuracyOrOffline === 'number') accuracy = accuracyOrOffline;
    }

    // If no coordinates provided, query real-time device GPS
    if (lat === null || lng === null) {
      try {
        const freshGps = await locationTrackingService.getCurrentPosition();
        lat = freshGps.latitude;
        lng = freshGps.longitude;
        accuracy = freshGps.accuracy;
      } catch (gpsErr) {
        const lastKnown = locationTrackingService.getFreshOrStaleLocation();
        if (lastKnown) {
          lat = lastKnown.latitude;
          lng = lastKnown.longitude;
          accuracy = lastKnown.accuracy;
        } else {
          throw new Error('Current location unavailable. Please enable device location services before initiating SOS distress beacon.');
        }
      }
    }

    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      throw new Error('Current location unavailable. Valid GPS coordinates are required for emergency distress beacon.');
    }

    let currentTrip = activeTrip;
    // If user is not currently in an active trip, automatically provision an emergency trip session
    if (!currentTrip) {
      try {
        const createRes = await fetch('/api/v1/trips', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.firebaseUid}`
          },
          body: JSON.stringify({
            destination: 'Solo Emergency Beacon Session',
            transportMode: 'CAR',
            targetMembersCount: 10
          })
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          currentTrip = createData.trip;
          setActiveTrip(createData.trip);
        } else {
          throw new Error('Unable to initialize emergency trip session');
        }
      } catch (e: any) {
        throw new Error(e.message || 'Unable to initialize emergency session');
      }
    }

    console.log('[SafeRoad SOS Dev Log] SOS API request started: POST /api/v1/trips/:tripId/sos');
    try {
      const res = await fetch(`/api/v1/trips/${currentTrip.id}/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.firebaseUid}`
        },
        body: JSON.stringify({ latitude: lat, longitude: lng, accuracy })
      });
      const result = await res.json();
      if (!res.ok) {
        console.error('[SafeRoad SOS Dev Log] SOS API error:', result.message);
        throw new Error(result.message || 'Failed to initiate SOS distress signal');
      }

      console.log('[SafeRoad SOS Dev Log] SOS API response received. SOS incident ID:', result.sos_id || result.sos?.id);
      setActiveSos(result.sos);
      await fetchUserData();
      return result.sos;
    } catch (apiErr: any) {
      console.error('[SafeRoad SOS Dev Log] SOS API error:', apiErr.message);
      throw apiErr;
    }
  };

  const handleActivateSos = async (sosId: string) => {
    console.log('[SafeRoad SOS Dev Log] SOS countdown completed');
    console.log('[SafeRoad SOS Dev Log] SOS activation started');
    try {
      // Obtain latest valid GPS location from locationTrackingService
      let freshCoords: { latitude: number; longitude: number; accuracy?: number } | undefined;
      try {
        const freshPos = await locationTrackingService.getCurrentPosition();
        freshCoords = {
          latitude: freshPos.latitude,
          longitude: freshPos.longitude,
          accuracy: freshPos.accuracy
        };
      } catch (locErr) {
        const cachedPos = locationTrackingService.getFreshOrStaleLocation();
        if (cachedPos) {
          freshCoords = {
            latitude: cachedPos.latitude,
            longitude: cachedPos.longitude,
            accuracy: cachedPos.accuracy
          };
        }
      }

      const res = await fetch(`/api/v1/sos/${sosId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.firebaseUid}`
        },
        body: JSON.stringify({ location: freshCoords })
      });
      const result = await res.json();
      if (!res.ok) {
        console.error('[SafeRoad SOS Dev Log] SOS activation API error:', result.message);
        throw new Error(result.message);
      }
      console.log('[SafeRoad SOS Dev Log] SOS activated successfully in backend. Incident ID:', sosId);
      console.log('[SafeRoad SOS Dev Log] Emergency SMS dispatch result:', result.sos?.emergencyContactDetails);
      setActiveSos(result.sos);
      await fetchUserData();
    } catch (actErr: any) {
      console.error('[SafeRoad SOS Dev Log] SOS API error:', actErr.message);
      throw actErr;
    }
  };

  const handleCancelSos = async (sosId: string, reason?: string) => {
    console.log('[SafeRoad SOS Dev Log] SOS countdown cancelled by user');
    const res = await fetch(`/api/v1/sos/${sosId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify({ reason })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    setActiveSos(result.sos);
    await fetchUserData();
  };

  const handleAcknowledgeSos = async (sosId: string) => {
    const res = await fetch(`/api/v1/sos/${sosId}/acknowledge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    setActiveSos(result.sos);
    await fetchUserData();
  };

  const handleEscalateSos = async (sosId: string, authority: AuthorityType) => {
    const res = await fetch(`/api/v1/sos/${sosId}/escalate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify({ authority })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    setActiveSos(result.sos);
    await fetchUserData();
  };

  const handleResolveSos = async (sosId: string, notes?: string) => {
    const res = await fetch(`/api/v1/sos/${sosId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify({ notes })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    setActiveSos(result.sos);
    await fetchUserData();
  };

  const handleFetchMedicalInfo = async (sosId: string) => {
    const res = await fetch(`/api/v1/sos/${sosId}/medical-info`, {
      headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
  };

  // 4. Gemini AI
  const handleGenerateGuide = async (destination: string, language: string): Promise<AIDestinationSafetyGuide> => {
    const res = await fetch('/api/v1/ai/safety-guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, language })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data.guide;
  };

  const handleEvaluateRoutes = async (origin: string, destination: string, mode: string): Promise<SafeRouteOption[]> => {
    const res = await fetch('/api/v1/ai/route-evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, transportMode: mode })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data.evaluatedRoutes || [];
  };

  const handleSelectApprovedRoute = async (route: SafeRouteOption) => {
    if (!activeTrip) return;
    const res = await fetch(`/api/v1/trips/${activeTrip.id}/select-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify({ selectedRoute: route })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }
    await fetchUserData();
  };

  // 5. Update Profile
  const handleUpdateProfile = async (updatedData: Partial<UserProfile>) => {
    const res = await fetch('/api/v1/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.firebaseUid}`
      },
      body: JSON.stringify(updatedData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    setCurrentUser(data.user);
    setUsers(users.map(u => u.id === data.user.id ? data.user : u));
  };

  // 1. Initial Auth Check Loading State
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-4 shadow-xl max-w-sm w-full">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-900 to-teal-700 text-white shadow-sm shadow-teal-900/20">
            <ShieldAlert className="w-6 h-6 text-teal-300 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">SafeRoad+ Safety Network</h3>
            <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-500 mt-2">
              <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
              <span>Verifying secure traveler session...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Show SafeRoad+ Login Screen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const handleNotificationClick = async (notif: NotificationItem) => {
    // 1. Mark as read on server
    try {
      await fetch(`/api/v1/notifications/${notif.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
      });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.warn('Could not mark notification read:', err);
    }

    // 2. Deep link based on notification type
    if (notif.title?.includes('Trip Completed') || notif.message?.includes('Trip Completed')) {
      setActiveTab('trip');
      setTripSubTab('completed');
    } else if (notif.type === 'SOS') {
      setIsSosModalOpen(true);
    } else if (notif.type === 'BOUNDARY_ALERT') {
      setActiveTab('bubble');
    } else if (notif.tripId) {
      setActiveTab('trip');
      setTripSubTab('current');
    }
  };

  const isEmergencyContactMissing = !currentUser.emergencyContact || !currentUser.emergencyContact.phone;

  // 3. Authenticated -> Render SafeRoad+ Main Application
  return (
    <div className="min-h-screen bg-[#0A0B0E] text-slate-100 font-sans antialiased selection:bg-[#4ADE80] selection:text-black flex flex-col">
      <Header
        currentUser={currentUser}
        users={users}
        onSwitchUser={handleSwitchUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
        }}
        notifications={notifications}
        onTriggerSos={() => setIsSosModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Unconfigured Emergency Contact Notification Banner */}
        {isEmergencyContactMissing && activeTab !== 'contact' && (
          <div className="mb-6 p-4 bg-amber-950/40 border border-amber-800/80 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="p-2 bg-amber-900/60 text-amber-300 rounded-lg shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-200 uppercase tracking-wide block font-mono">
                  ACTION REQUIRED: CONFIGURE EMERGENCY CONTACT
                </span>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Register your trusted contact to receive automated SMS/Email notifications during SOS emergencies.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsContactSetupModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs rounded-lg transition-colors"
                id="banner-setup-contact-btn"
              >
                Set Up Contact
              </button>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <SafeRoadMapScreen
            activeTrip={activeTrip}
            currentUser={currentUser}
            members={tripMembers}
            activeSos={activeSos}
            onEmitLocation={handleEmitLocation}
            onTriggerSosModal={() => setIsSosModalOpen(true)}
          />
        )}

        {activeTab === 'trip' && (
          <TripManagement
            activeTrip={activeTrip}
            members={tripMembers}
            currentUser={currentUser}
            activeSos={activeSos}
            initialSubTab={tripSubTab}
            onCreateTrip={handleCreateTrip}
            onJoinTrip={handleJoinTrip}
            onUpdateTripState={handleUpdateTripState}
            onTransferLeadership={handleTransferLeadership}
            onArchiveTrip={handleArchiveTrip}
            onSearchHotels={handleSearchHotels}
            onGetAiHotelRecommendations={handleGetAiHotelRecommendations}
            onAcknowledgeSos={handleAcknowledgeSos}
            onEscalateSos={handleEscalateSos}
            onResolveSos={handleResolveSos}
            onViewLocationOnMap={(lat, lng) => {
              setActiveTab('map');
            }}
          />
        )}

        {activeTab === 'bubble' && (
          <SafeBubbleMonitor
            activeTrip={activeTrip}
            members={tripMembers}
            currentUser={currentUser}
            onEmitLocation={handleEmitLocation}
            onUpdateBubbleRadius={handleUpdateBubbleRadius}
            onBoundaryResponse={handleBoundaryResponse}
            onTriggerSosModal={() => setIsSosModalOpen(true)}
            onRequestEnableLocation={handleRequestEnableLocation}
            gpsPermissionStatus={gpsPermissionStatus}
            gpsServicesStatus={gpsServicesStatus}
            isOnline={isOnline}
          />
        )}

        {activeTab === 'ai-guide' && (
          <AiSafetyGuideView
            activeTrip={activeTrip}
            currentUser={currentUser}
            onGenerateGuide={handleGenerateGuide}
            onEvaluateRoutes={handleEvaluateRoutes}
            onSelectApprovedRoute={handleSelectApprovedRoute}
          />
        )}

        {activeTab === 'chat' && (
          <TripChat
            activeTrip={activeTrip}
            currentUser={currentUser}
            members={tripMembers}
          />
        )}

        {activeTab === 'offline' && (
          <OfflineBleSimulator
            activeTrip={activeTrip}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'contact' && (
          <EmergencyContactScreen
            currentUser={currentUser}
            onSaveContact={handleSaveEmergencyContact}
            onRemoveContact={handleRemoveEmergencyContact}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfileView
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'authority' && (
          <AuthorityDashboard currentUser={currentUser} />
        )}

        {activeTab === 'sos-tests' && (
          <SosTestSuite
            activeTrip={activeTrip}
            currentUser={currentUser}
            onRefreshTrip={fetchUserData}
            onSelectSos={(sos) => {
              setActiveSos(sos);
              setIsSosModalOpen(true);
            }}
          />
        )}

        {activeTab === 'notifications' && (
          <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#2D3139] pb-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Notifications Center</h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time alerts and safety broadcasts</p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={async () => {
                    await fetch('/api/v1/notifications/mark-all-read', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
                    });
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                  }}
                  className="text-xs text-[#4ADE80] hover:underline"
                >
                  Mark All as Read
                </button>
              )}
            </div>
            {notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`border p-3.5 rounded-lg text-xs space-y-1.5 cursor-pointer transition-all ${
                      n.isRead
                        ? 'bg-[#11141A] border-[#2D3139] hover:bg-[#161922]'
                        : 'bg-emerald-950/20 border-[#4ADE80]/50 hover:bg-emerald-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center space-x-2">
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />}
                        <span>{n.title}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">{new Date(n.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300">{n.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#11141A] border border-[#2D3139] p-8 rounded-lg text-center">
                <p className="text-xs text-slate-400">No new notifications.</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-[#2D3139]">
          <AuditLogsView />
        </div>
      </main>

      {/* Emergency Contact Setup Modal */}
      <EmergencyContactSetupModal
        isOpen={isContactSetupModalOpen}
        onClose={() => setIsContactSetupModalOpen(false)}
        currentUser={currentUser}
        onSaveContact={handleSaveEmergencyContact}
      />

      <SosEmergencyModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        activeTrip={activeTrip}
        currentUser={currentUser}
        activeSos={activeSos}
        onInitiateSos={handleInitiateSos}
        onActivateSos={handleActivateSos}
        onCancelSos={handleCancelSos}
        onAcknowledgeSos={handleAcknowledgeSos}
        onEscalateSos={handleEscalateSos}
        onResolveSos={handleResolveSos}
        onFetchMedicalInfo={handleFetchMedicalInfo}
      />
    </div>
  );
}
