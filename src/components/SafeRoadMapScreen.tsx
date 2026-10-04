import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Trip, TripMember, UserProfile, SOSRecord } from '../types';
import { GEOFENCE_CONFIG } from '../config/geofenceConfig';
import { createGeoJsonCircle } from '../../server/geofenceService';
import {
  Crosshair,
  Info,
  Compass,
  ShieldAlert,
  Route,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Radio,
  Users,
  AlertTriangle
} from 'lucide-react';

interface DestinationPoint {
  lat: number;
  lng: number;
  address?: string;
}

interface RouteMetrics {
  distanceKm: number;
  durationMinutes: number;
}

interface SafeRoadMapScreenProps {
  activeTrip?: Trip | null;
  currentUser?: UserProfile;
  members?: TripMember[];
  activeSos?: SOSRecord | null;
  onEmitLocation?: (lat: number, lng: number, accuracy?: number) => Promise<void>;
  onTriggerSosModal?: () => void;
}

export const SafeRoadMapScreen: React.FC<SafeRoadMapScreenProps> = ({
  activeTrip,
  currentUser,
  members = [],
  activeSos,
  onEmitLocation,
  onTriggerSosModal
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const leaderMarkerRef = useRef<maplibregl.Marker | null>(null);
  const sosMarkerRef = useRef<maplibregl.Marker | null>(null);
  const memberMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<DestinationPoint | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Routing State
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);

  // Determine Leader and Bubble parameters
  const leaderLat = activeTrip?.leaderLatitude ?? activeTrip?.hotel?.latitude ?? null;
  const leaderLng = activeTrip?.leaderLongitude ?? activeTrip?.hotel?.longitude ?? null;
  const bubbleRadius = activeTrip?.safeBubbleRadiusMeters || GEOFENCE_CONFIG.SAFE_BUBBLE_RADIUS_METERS;

  // Initialize MapLibre Map with OpenStreetMap raster tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const osmStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        }
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    // Initial neutral overview center until real device GPS or leader fix is acquired
    const initialCenterLng = leaderLng ?? 78.9629;
    const initialCenterLat = leaderLat ?? 20.5937;
    const initialZoom = leaderLng && leaderLat ? 14 : 4;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: osmStyle,
      center: [initialCenterLng, initialCenterLat],
      zoom: initialZoom,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: false,
        customAttribution: '© OpenStreetMap contributors'
      }),
      'bottom-right'
    );

    map.on('load', () => {
      // 1. Add GeoJSON source & layer for OpenRouteService Polyline
      map.addSource('route-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'route-layer',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3B82F6', // Blue polyline
          'line-width': 5,
          'line-opacity': 0.85
        }
      });

      // 2. Add Dynamic Safe Bubble 100m Polygon GeoJSON source & layer
      const bubblePolygon = (leaderLng !== null && leaderLat !== null)
        ? createGeoJsonCircle(leaderLng, leaderLat, bubbleRadius)
        : { type: 'FeatureCollection' as const, features: [] };

      map.addSource('dynamic-safe-bubble-source', {
        type: 'geojson',
        data: bubblePolygon
      });

      // Bubble Fill
      map.addLayer({
        id: 'dynamic-safe-bubble-fill',
        type: 'fill',
        source: 'dynamic-safe-bubble-source',
        paint: {
          'fill-color': '#4ADE80',
          'fill-opacity': 0.15
        }
      });

      // Bubble Stroke Outline
      map.addLayer({
        id: 'dynamic-safe-bubble-line',
        type: 'line',
        source: 'dynamic-safe-bubble-source',
        paint: {
          'line-color': '#22C55E',
          'line-width': 2.5,
          'line-dasharray': [3, 2]
        }
      });
    });

    // Map Click Listener to select Destination
    map.on('click', (e) => {
      const { lat, lng } = e.lngLat;
      const newDest = { lat, lng };
      setSelectedDestination(newDest);

      // Clear previous route
      clearRouteLayer(map);
      setRouteMetrics(null);
      setRouteError(null);

      // Create or update destination marker
      if (destMarkerRef.current) {
        destMarkerRef.current.setLngLat([lng, lat]);
      } else {
        const el = document.createElement('div');
        el.className = 'custom-dest-marker';
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.backgroundColor = '#EF4444';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid #FFFFFF';
        el.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.8)';
        el.style.cursor = 'pointer';

        destMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    });

    mapRef.current = map;

    // Request initial GPS location
    requestGpsLocation();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Dynamic Safe Bubble Polygon on map when Leader Coordinates shift
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    const source = map.getSource('dynamic-safe-bubble-source') as maplibregl.GeoJSONSource;
    if (source && leaderLat && leaderLng) {
      const updatedPolygon = createGeoJsonCircle(leaderLng, leaderLat, bubbleRadius);
      source.setData(updatedPolygon);
    }
  }, [leaderLat, leaderLng, bubbleRadius]);

  // Update Leader & Member Markers on Map smoothly in place
  useEffect(() => {
    if (!mapRef.current || !activeTrip) return;
    const map = mapRef.current;

    // 1. Leader Marker
    if (leaderLat && leaderLng) {
      const now = Date.now();
      const lastUpdateMs = activeTrip.leaderLastLocationUpdate ? new Date(activeTrip.leaderLastLocationUpdate).getTime() : null;
      const ageSeconds = lastUpdateMs ? Math.max(0, Math.floor((now - lastUpdateMs) / 1000)) : null;
      const accuracy = activeTrip.leaderAccuracyMeters || 8;
      const isStale = ageSeconds !== null && ageSeconds > 15;

      const leaderPopupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 6px 8px; color: #0F1218;">
          <div style="font-weight: 700; font-size: 13px; color: #166534; display: flex; align-items: center; gap: 4px;">
            👑 ${activeTrip.leaderName} (Trip Leader)
          </div>
          <div style="font-size: 11px; margin-top: 4px; color: #374151;">
            <div><strong>Role:</strong> Perimeter Anchor</div>
            <div><strong>Status:</strong> <span style="color: ${isStale ? '#D97706' : '#16A34A'}; font-weight: 600;">${isStale ? 'STALE' : 'LIVE'} (●)</span></div>
            <div><strong>Accuracy:</strong> ±${accuracy.toFixed(1)}m</div>
            <div><strong>Last Fix:</strong> ${ageSeconds !== null ? `${ageSeconds}s ago` : 'Just now'}</div>
            <div style="font-family: monospace; font-size: 10px; margin-top: 2px; color: #6B7280;">
              ${leaderLat.toFixed(5)}, ${leaderLng.toFixed(5)}
            </div>
          </div>
        </div>
      `;

      if (leaderMarkerRef.current) {
        leaderMarkerRef.current.setLngLat([leaderLng, leaderLat]);
        const popup = leaderMarkerRef.current.getPopup();
        if (popup) {
          popup.setHTML(leaderPopupHtml);
        }
      } else {
        const leaderEl = document.createElement('div');
        leaderEl.className = 'custom-leader-marker';
        leaderEl.innerHTML = `
          <div style="background: #4ADE80; color: #000; font-weight: bold; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 3px solid #0F1218; box-shadow: 0 0 14px rgba(74, 222, 128, 0.9); font-size: 14px; cursor: pointer;">
            👑
          </div>
          <div style="background: #0F1218; color: #4ADE80; font-size: 9px; font-weight: bold; padding: 1px 4px; border: 1px solid rgba(74, 222, 128, 0.5); text-align: center; margin-top: 2px; white-space: nowrap; font-family: monospace; border-radius: 3px;">
            ${activeTrip.leaderName.split(' ')[0]} (LEADER)
          </div>
        `;
        const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(leaderPopupHtml);
        leaderMarkerRef.current = new maplibregl.Marker({ element: leaderEl })
          .setLngLat([leaderLng, leaderLat])
          .setPopup(popup)
          .addTo(map);
      }
    }

    // 2. Member Markers
    const currentMemberIds = new Set(members.map(m => m.id));

    // Clean up markers of members who left
    memberMarkersRef.current.forEach((marker, memberId) => {
      if (!currentMemberIds.has(memberId)) {
        marker.remove();
        memberMarkersRef.current.delete(memberId);
      }
    });

    // Update or create active member markers
    members.forEach(m => {
      if (m.userId === activeTrip.leaderId) return; // Leader already rendered as perimeter anchor
      if (!m.lastLatitude || !m.lastLongitude) return;

      const isBreached = m.boundaryStatus === 'OUTSIDE_BUBBLE';
      const isAccuracyPoor = m.boundaryStatus === 'LOCATION_ACCURACY_INSUFFICIENT';
      const dist = m.distanceFromLeaderMeters !== undefined ? Math.round(m.distanceFromLeaderMeters) : 0;
      const now = Date.now();
      const lastUpdateMs = m.lastLocationUpdate ? new Date(m.lastLocationUpdate).getTime() : null;
      const ageSeconds = lastUpdateMs ? Math.max(0, Math.floor((now - lastUpdateMs) / 1000)) : null;
      const isStale = ageSeconds !== null && ageSeconds > 15;
      const isOffline = ageSeconds !== null && ageSeconds > 60;
      const accuracy = m.accuracyMeters || 10;

      const badgeColor = isBreached ? '#EF4444' : isAccuracyPoor ? '#F59E0B' : '#3B82F6';
      const labelColor = isBreached ? '#EF4444' : isAccuracyPoor ? '#F59E0B' : '#4ADE80';

      const memberPopupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 6px 8px; color: #0F1218;">
          <div style="font-weight: 700; font-size: 13px; color: #1E3A8A; display: flex; align-items: center; gap: 4px;">
            👤 ${m.userName}
          </div>
          <div style="font-size: 11px; margin-top: 4px; color: #374151;">
            <div><strong>Role:</strong> Member</div>
            <div><strong>Status:</strong> <span style="color: ${isOffline ? '#6B7280' : isStale ? '#D97706' : '#16A34A'}; font-weight: 600;">${isOffline ? 'OFFLINE' : isStale ? 'STALE' : 'LIVE'} (●)</span></div>
            <div><strong>Distance to Leader:</strong> <span style="font-weight: 700; color: ${isBreached ? '#DC2626' : '#16A34A'};">${dist}m</span> ${isBreached ? '⚠️ (OUTSIDE BUBBLE)' : '✅ (INSIDE)'}</div>
            <div><strong>GPS Accuracy:</strong> ±${accuracy.toFixed(1)}m</div>
            <div><strong>Last Updated:</strong> ${ageSeconds !== null ? `${ageSeconds}s ago` : 'Just now'}</div>
            <div style="font-family: monospace; font-size: 10px; margin-top: 2px; color: #6B7280;">
              ${m.lastLatitude.toFixed(5)}, ${m.lastLongitude.toFixed(5)}
            </div>
          </div>
        </div>
      `;

      const existing = memberMarkersRef.current.get(m.id);
      if (existing) {
        existing.setLngLat([m.lastLongitude, m.lastLatitude]);
        const el = existing.getElement();
        el.innerHTML = `
          <div style="background: ${badgeColor}; color: #FFF; font-weight: bold; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; box-shadow: 0 0 10px rgba(0,0,0,0.5); font-size: 11px; cursor: pointer;">
            👤
          </div>
          <div style="background: #0F1218; color: ${labelColor}; font-size: 8px; font-weight: bold; padding: 1px 3px; border: 1px solid #2D3139; text-align: center; margin-top: 1px; white-space: nowrap; font-family: monospace; border-radius: 2px;">
            ${m.userName.split(' ')[0]} (${dist}m)
          </div>
        `;
        const popup = existing.getPopup();
        if (popup) {
          popup.setHTML(memberPopupHtml);
        }
      } else {
        const memEl = document.createElement('div');
        memEl.className = 'custom-member-marker';
        memEl.innerHTML = `
          <div style="background: ${badgeColor}; color: #FFF; font-weight: bold; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; box-shadow: 0 0 10px rgba(0,0,0,0.5); font-size: 11px; cursor: pointer;">
            👤
          </div>
          <div style="background: #0F1218; color: ${labelColor}; font-size: 8px; font-weight: bold; padding: 1px 3px; border: 1px solid #2D3139; text-align: center; margin-top: 1px; white-space: nowrap; font-family: monospace; border-radius: 2px;">
            ${m.userName.split(' ')[0]} (${dist}m)
          </div>
        `;
        const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(memberPopupHtml);
        const marker = new maplibregl.Marker({ element: memEl })
          .setLngLat([m.lastLongitude, m.lastLatitude])
          .setPopup(popup)
          .addTo(map);
        memberMarkersRef.current.set(m.id, marker);
      }
    });
  }, [leaderLat, leaderLng, members, activeTrip]);

  const clearRouteLayer = (mapInstance?: maplibregl.Map) => {
    const map = mapInstance || mapRef.current;
    if (map) {
      const source = map.getSource('route-source') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: []
        });
      }
    }
  };

  // Function to obtain user's current GPS location
  const requestGpsLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation API is not supported by your browser/device.');
      setIsLocating(false);
      setPermissionGranted(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 10;
        setUserLocation({ lat, lng });
        setPermissionGranted(true);
        setIsLocating(false);

        // Notify parent if handler is present
        if (onEmitLocation) {
          onEmitLocation(lat, lng, accuracy).catch(console.error);
        }

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 15,
            essential: true
          });

          if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([lng, lat]);
          } else {
            const userEl = document.createElement('div');
            userEl.className = 'custom-user-marker';
            userEl.style.width = '20px';
            userEl.style.height = '20px';
            userEl.style.backgroundColor = '#4ADE80';
            userEl.style.borderRadius = '50%';
            userEl.style.border = '3px solid #000000';
            userEl.style.boxShadow = '0 0 14px rgba(74, 222, 128, 0.9)';

            userMarkerRef.current = new maplibregl.Marker({ element: userEl })
              .setLngLat([lng, lat])
              .addTo(mapRef.current);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        setPermissionGranted(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('GPS permission denied. Please enable location access in browser/settings.');
        } else {
          setLocationError(`Location error: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCenterOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        essential: true
      });
    } else {
      requestGpsLocation();
    }
  };

  const handleCenterOnLeader = () => {
    if (leaderLat && leaderLng && mapRef.current) {
      mapRef.current.flyTo({
        center: [leaderLng, leaderLat],
        zoom: 16,
        essential: true
      });
    }
  };

  const handleClearDestination = () => {
    setSelectedDestination(null);
    setRouteMetrics(null);
    setRouteError(null);
    clearRouteLayer();

    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
  };

  // Function to calculate driving route via OpenRouteService API
  const handleCalculateRoute = async () => {
    if (!userLocation || !selectedDestination) return;

    setIsCalculatingRoute(true);
    setRouteError(null);

    const startStr = `${userLocation.lng},${userLocation.lat}`;
    const endStr = `${selectedDestination.lng},${selectedDestination.lat}`;

    try {
      const res = await fetch(`/api/v1/routing/directions?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`);
      
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const message = errJson.message || `Routing request failed (HTTP ${res.status})`;
        setRouteError(message);
        setIsCalculatingRoute(false);
        return;
      }

      const data = await res.json();
      const feature = data.features?.[0];

      if (!feature || !feature.geometry) {
        setRouteError('Unable to find a valid driving route between these locations.');
        setIsCalculatingRoute(false);
        return;
      }

      // Draw Polyline on MapLibre map
      if (mapRef.current) {
        const source = mapRef.current.getSource('route-source') as maplibregl.GeoJSONSource;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: [feature]
          });
        }

        // Fit map bounds to show full route
        const coords: [number, number][] = feature.geometry.coordinates;
        if (coords.length > 0) {
          const bounds = coords.reduce(
            (b, coord) => b.extend(coord as [number, number]),
            new maplibregl.LngLatBounds(coords[0], coords[0])
          );
          mapRef.current.fitBounds(bounds, { padding: 60 });
        }
      }

      // Calculate distance in km and duration in minutes
      const summary = feature.properties?.summary;
      const distKm = summary?.distance ? Math.round((summary.distance / 1000) * 10) / 10 : 0;
      const durationMin = summary?.duration ? Math.round(summary.duration / 60) : 0;

      setRouteMetrics({
        distanceKm: distKm,
        durationMinutes: durationMin
      });

      setIsCalculatingRoute(false);
    } catch (err: any) {
      setIsCalculatingRoute(false);
      setRouteError(`Network failure: ${err.message || 'Unable to connect to OpenRouteService server.'}`);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Map Control Banner */}
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-5 shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-[#4ADE80] border border-emerald-800">
              <Compass className="w-3 h-3 mr-1 text-[#4ADE80]" />
              <span>Dynamic Safe Bubble Active</span>
            </span>
            {activeTrip && (
              <span className="text-[10px] bg-[#1A1D24] text-slate-300 px-2 py-0.5 rounded font-semibold border border-[#2D3139]">
                100m Perimeter Anchor
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white mt-1 font-sans">
            Expedition Radar & Safe Route Navigation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Geofence follows Trip Leader <span className="text-[#4ADE80] font-semibold">{activeTrip?.leaderName || 'Trip Leader'}</span> in real-time.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTrip && (
            <button
              onClick={handleCenterOnLeader}
              className="bg-[#1A1D24] hover:bg-[#252932] text-slate-200 font-semibold text-xs px-3.5 py-2 rounded-lg border border-[#2D3139] flex items-center space-x-1.5 transition-colors font-mono"
            >
              <span>👑 Focus Leader</span>
            </button>
          )}

          <button
            onClick={handleCenterOnUser}
            disabled={isLocating}
            className="bg-[#1A1D24] hover:bg-[#252932] text-slate-200 font-semibold text-xs px-3.5 py-2 rounded-lg border border-[#2D3139] flex items-center space-x-2 transition-colors font-mono"
            id="center-user-btn"
          >
            <Crosshair className={`w-3.5 h-3.5 text-[#4ADE80] ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Acquiring GPS...' : 'My Location'}</span>
          </button>

          {selectedDestination && (
            <button
              onClick={handleClearDestination}
              className="bg-[#1A1D24] hover:bg-red-950/40 text-slate-300 hover:text-red-400 font-semibold text-xs px-3 py-2 rounded-lg border border-[#2D3139] hover:border-red-800 transition-colors font-mono"
            >
              Clear Destination
            </button>
          )}

          {onTriggerSosModal && (!activeSos || activeSos.status === 'CANCELLED' || activeSos.status === 'RESOLVED') && (
            <button
              onClick={onTriggerSosModal}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-colors shadow font-mono"
              id="map-trigger-sos-btn"
            >
              <AlertTriangle className="w-3.5 h-3.5 fill-white text-red-600" />
              <span>SOS Emergency</span>
            </button>
          )}
        </div>
      </div>

      {/* Active SOS Alert Banner Overlay */}
      {activeSos && (activeSos.status === 'INITIATED' || activeSos.status === 'ACTIVE' || activeSos.status === 'ACKNOWLEDGED' || activeSos.status === 'ESCALATED') && (
        <div className="bg-red-950/80 border-2 border-red-500 rounded-xl p-4 text-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow animate-pulse font-mono">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5 fill-white text-red-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-red-200">
                  Active Emergency SOS: {activeSos.status}
                </span>
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold uppercase">
                  {activeSos.role}
                </span>
              </div>
              <p className="text-xs text-red-300 mt-0.5">
                <strong>{activeSos.userName}</strong> ({activeSos.userPhone}) at GPS: {activeSos.latitude.toFixed(5)}, {activeSos.longitude.toFixed(5)}
              </p>
            </div>
          </div>

          {onTriggerSosModal && (
            <button
              onClick={onTriggerSosModal}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg shrink-0 transition-colors shadow font-mono"
              id="map-open-sos-btn"
            >
              Open Incident Command
            </button>
          )}
        </div>
      )}

      {/* Permission Warning if Denied */}
      {locationError && (
        <div className="bg-amber-950/60 border border-amber-800 rounded-xl p-3.5 text-amber-400 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{locationError}</span>
          </div>
          <button
            onClick={requestGpsLocation}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg font-mono"
          >
            Retry Permission
          </button>
        </div>
      )}

      {/* Routing Error Warning */}
      {routeError && (
        <div className="bg-red-950/60 border border-red-800 rounded-xl p-3.5 text-red-400 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{routeError}</span>
          </div>
          <button
            onClick={() => setRouteError(null)}
            className="text-red-400 hover:text-red-300 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Map Viewport Frame */}
      <div className="relative bg-[#0A0B0E] border border-[#2D3139] rounded-xl overflow-hidden shadow">
        {/* Map Canvas Container */}
        <div
          ref={mapContainerRef}
          className="w-full h-[540px] z-10"
          style={{ minHeight: '520px' }}
        />

        {/* Floating Telemetry & Navigation Overlay */}
        <div className="absolute top-4 left-4 z-20 bg-[#0F1218]/95 border border-[#2D3139] rounded-xl p-4 text-xs max-w-sm space-y-3 backdrop-blur-md shadow-xl text-slate-300 font-mono">
          <div className="border-b border-[#2D3139] pb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold text-white flex items-center space-x-1.5 font-sans">
              <Radio className="w-3.5 h-3.5 text-[#4ADE80] animate-pulse" />
              <span>Safe Bubble Telemetry</span>
            </span>
          </div>

          {/* Dynamic Bubble Reference Information */}
          {activeTrip && (
            <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">👑 Leader Anchor</span>
                <span className="text-[#4ADE80] font-semibold">{bubbleRadius}m Bubble</span>
              </div>
              <div className="text-slate-400 font-mono text-[11px]">
                {leaderLat !== null && leaderLng !== null ? (
                  `[${leaderLat.toFixed(5)}, ${leaderLng.toFixed(5)}]`
                ) : (
                  <span className="text-amber-400 italic">Leader GPS updating...</span>
                )}
              </div>
            </div>
          )}

          {/* Current User GPS / Start Location */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#4ADE80]" />
                <span>My Coordinates:</span>
              </span>
              <button
                onClick={handleCenterOnUser}
                disabled={isLocating}
                className="text-[10px] bg-[#1A1D24] text-slate-200 px-2 py-0.5 rounded hover:bg-[#252932] border border-[#2D3139] transition-colors font-semibold font-mono"
              >
                {isLocating ? 'Locating...' : 'Sync GPS'}
              </button>
            </div>
            {userLocation ? (
              <div className="bg-[#0A0B0E] border border-[#2D3139] rounded px-2.5 py-1.5 text-xs font-mono text-[#4ADE80]">
                LAT: {userLocation.lat.toFixed(5)} • LNG: {userLocation.lng.toFixed(5)}
              </div>
            ) : (
              <span className="text-slate-500 italic text-xs block">Acquiring GPS coordinates...</span>
            )}
          </div>

          {/* Selected Destination Coordinates / Field */}
          <div className="border-t border-[#2D3139] pt-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Navigation Target:</span>
              </span>

              {selectedDestination && (
                <button
                  onClick={handleClearDestination}
                  className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedDestination ? (
              <div className="bg-red-950/60 border border-red-800 rounded px-2.5 py-1.5 text-xs font-mono text-red-400 font-medium">
                LAT: {selectedDestination.lat.toFixed(5)} • LNG: {selectedDestination.lng.toFixed(5)}
              </div>
            ) : (
              <div className="bg-[#0A0B0E] border border-dashed border-[#2D3139] rounded px-2.5 py-2 text-[11px] text-slate-500 text-center">
                Click map to select target checkpoint
              </div>
            )}
          </div>

          {/* Route Summary Metrics */}
          {routeMetrics && (
            <div className="border-t border-[#2D3139] pt-2.5 space-y-1.5">
              <span className="text-xs font-bold text-white block font-sans">
                Calculated Safe Driving Route
              </span>
              <div className="flex items-center justify-between text-xs bg-[#0A0B0E] p-2.5 rounded-lg border border-[#2D3139]">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Distance</span>
                  <span className="text-white font-extrabold">{routeMetrics.distanceKm} km</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Est. Duration</span>
                  <span className="text-[#4ADE80] font-extrabold">{routeMetrics.durationMinutes} min</span>
                </div>
              </div>
            </div>
          )}

          {/* Calculate Route Action Button */}
          {userLocation && selectedDestination && (
            <div className="border-t border-[#2D3139] pt-2">
              <button
                onClick={handleCalculateRoute}
                disabled={isCalculatingRoute}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-3.5 rounded-lg flex items-center justify-center space-x-2 transition-colors shadow font-mono"
              >
                {isCalculatingRoute ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Calculating Safe Route...</span>
                  </>
                ) : (
                  <>
                    <Route className="w-4 h-4" />
                    <span>{routeMetrics ? 'Recalculate Route' : 'Calculate Route'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Safe Bubble Status Strip */}
        <div className="absolute bottom-4 left-4 z-20 bg-[#0F1218]/95 border border-[#2D3139] rounded-lg px-3.5 py-2 text-xs text-slate-300 backdrop-blur-md shadow flex items-center space-x-3 font-mono">
          <span className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] animate-pulse" />
            <span className="font-semibold text-white">100m Dynamic Geofence</span>
          </span>
          <span className="text-[#2D3139]">|</span>
          <span className="flex items-center space-x-1.5 font-medium text-slate-300">
            <Users className="w-3.5 h-3.5 text-[#4ADE80]" />
            <span>{members.length} Active Members</span>
          </span>
        </div>
      </div>
    </div>
  );
};
