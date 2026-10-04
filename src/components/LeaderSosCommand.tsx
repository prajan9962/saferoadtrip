import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SOSRecord, Trip, TripMember, UserProfile, AuthorityType } from '../types';
import {
  AlertTriangle,
  ShieldAlert,
  MapPin,
  CheckCircle,
  Clock,
  Phone,
  Radio,
  ExternalLink,
  Shield,
  Activity,
  HeartPulse,
  Send,
  RefreshCw,
  Navigation,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface LeaderSosCommandProps {
  activeTrip: Trip | null;
  currentUser: UserProfile;
  activeSos?: SOSRecord | null;
  members?: TripMember[];
  onAcknowledge?: (sosId: string) => Promise<void>;
  onEscalate?: (sosId: string, authority: AuthorityType) => Promise<void>;
  onResolve?: (sosId: string, notes?: string) => Promise<void>;
  onViewOnMap?: (lat: number, lng: number) => void;
  onRefresh?: () => void;
}

export const LeaderSosCommand: React.FC<LeaderSosCommandProps> = ({
  activeTrip,
  currentUser,
  activeSos: propActiveSos,
  members = [],
  onAcknowledge,
  onEscalate,
  onResolve,
  onViewOnMap,
  onRefresh
}) => {
  const [activeSos, setActiveSos] = useState<SOSRecord | null>(propActiveSos || null);
  const [loadingState, setLoadingState] = useState<'LOADING' | 'ERROR' | 'READY'>('LOADING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const [selectedAuthority, setSelectedAuthority] = useState<AuthorityType>('POLICE');
  const [resolveNotes, setResolveNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [victimMedical, setVictimMedical] = useState<any | null>(null);
  const [showMedical, setShowMedical] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<maplibregl.Map | null>(null);
  const sosMarkerRef = useRef<maplibregl.Marker | null>(null);
  const leaderMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Sync prop if passed
  useEffect(() => {
    if (propActiveSos !== undefined) {
      setActiveSos(propActiveSos);
    }
  }, [propActiveSos]);

  // Fetch active SOS and diagnostics from backend
  const fetchActiveSosFromBackend = async () => {
    if (!activeTrip) {
      setLoadingState('READY');
      setActiveSos(null);
      return;
    }

    try {
      setErrorMessage(null);
      const token = currentUser.firebaseUid || currentUser.id;
      const res = await fetch(`/api/v1/trips/${activeTrip.id}/active-sos`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`API error (${res.status}): Unable to load active SOS incidents.`);
      }

      const data = await res.json();
      setActiveSos(data.activeSos || null);
      setLoadingState('READY');

      // Also fetch diagnostics
      try {
        const diagRes = await fetch('/api/v1/sos/diagnostics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (diagRes.ok) {
          const diagData = await diagRes.json();
          setDiagnostics(diagData);
        }
      } catch (dErr) {
        console.warn('[Diagnostics fetch error]', dErr);
      }
    } catch (err: any) {
      console.error('[LeaderSosCommand] Fetch failed:', err);
      setErrorMessage(err.message || 'Unable to connect to SOS backend service.');
      setLoadingState('ERROR');
    }
  };

  // Real-time polling every 3 seconds
  useEffect(() => {
    fetchActiveSosFromBackend();
    const interval = setInterval(fetchActiveSosFromBackend, 3000);
    return () => clearInterval(interval);
  }, [activeTrip?.id, currentUser.id]);

  // Fetch medical data if leader and activeSos exists
  useEffect(() => {
    if (activeSos && (activeTrip?.leaderId === currentUser.id || currentUser.id.includes('leader'))) {
      const fetchMedical = async () => {
        try {
          const token = currentUser.firebaseUid || currentUser.id;
          const res = await fetch(`/api/v1/sos/${activeSos.id}/medical-info`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setVictimMedical(data);
          }
        } catch (e) {
          console.warn('[Leader Medical Fetch]', e);
        }
      };
      fetchMedical();
    } else {
      setVictimMedical(null);
    }
  }, [activeSos?.id, activeTrip?.leaderId, currentUser.id]);

  // Initialize MapLibre mini map when active SOS is present
  useEffect(() => {
    if (!activeSos || !miniMapContainerRef.current) return;

    if (!miniMapRef.current) {
      try {
        const map = new maplibregl.Map({
          container: miniMapContainerRef.current,
          style: {
            version: 8,
            sources: {
              'osm-tiles': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
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
          },
          center: [activeSos.longitude, activeSos.latitude],
          zoom: 14
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
        miniMapRef.current = map;
      } catch (mErr) {
        console.error('[MapLibre Mini-map initialization error]', mErr);
      }
    } else {
      miniMapRef.current.setCenter([activeSos.longitude, activeSos.latitude]);
    }

    // Add or update SOS Marker
    if (miniMapRef.current) {
      if (!sosMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'w-7 h-7 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg animate-bounce';
        el.innerHTML = '🚨';
        sosMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([activeSos.longitude, activeSos.latitude])
          .addTo(miniMapRef.current);
      } else {
        sosMarkerRef.current.setLngLat([activeSos.longitude, activeSos.latitude]);
      }

      // Leader Marker if real leader coordinates available
      const leaderLat = activeTrip?.leaderLatitude;
      const leaderLng = activeTrip?.leaderLongitude;
      if (leaderLat !== undefined && leaderLat !== null && leaderLng !== undefined && leaderLng !== null) {
        if (!leaderMarkerRef.current) {
          const leaderEl = document.createElement('div');
          leaderEl.className = 'w-6 h-6 bg-teal-600 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-md';
          leaderEl.innerHTML = '★';
          leaderMarkerRef.current = new maplibregl.Marker({ element: leaderEl })
            .setLngLat([leaderLng, leaderLat])
            .addTo(miniMapRef.current);
        } else {
          leaderMarkerRef.current.setLngLat([leaderLng, leaderLat]);
        }
      }
    }
  }, [activeSos?.id, activeSos?.latitude, activeSos?.longitude, activeTrip?.leaderLatitude, activeTrip?.leaderLongitude]);

  // Calculate approximate distance from leader if available
  const leaderLat = activeTrip?.leaderLatitude;
  const leaderLng = activeTrip?.leaderLongitude;
  let distanceMeters: number | null = null;
  if (activeSos && leaderLat !== undefined && leaderLat !== null && leaderLng !== undefined && leaderLng !== null) {
    const dLat = (activeSos.latitude - leaderLat) * (Math.PI / 180);
    const dLon = (activeSos.longitude - leaderLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(leaderLat * (Math.PI / 180)) * Math.cos(activeSos.latitude * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceMeters = Math.round(6371000 * c);
  }

  // Handle Actions
  const handleAcknowledgeClick = async () => {
    if (!activeSos) return;
    setIsAcknowledging(true);
    try {
      if (onAcknowledge) {
        await onAcknowledge(activeSos.id);
      } else {
        const token = currentUser.firebaseUid || currentUser.id;
        await fetch(`/api/v1/sos/${activeSos.id}/acknowledge`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      await fetchActiveSosFromBackend();
    } catch (e: any) {
      alert(e.message || 'Failed to acknowledge SOS');
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleEscalateClick = async () => {
    if (!activeSos) return;
    setIsEscalating(true);
    try {
      if (onEscalate) {
        await onEscalate(activeSos.id, selectedAuthority);
      } else {
        const token = currentUser.firebaseUid || currentUser.id;
        await fetch(`/api/v1/sos/${activeSos.id}/escalate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ authority: selectedAuthority })
        });
      }
      await fetchActiveSosFromBackend();
    } catch (e: any) {
      alert(e.message || 'Failed to escalate SOS');
    } finally {
      setIsEscalating(false);
    }
  };

  const handleResolveClick = async () => {
    if (!activeSos) return;
    setIsResolving(true);
    try {
      if (onResolve) {
        await onResolve(activeSos.id, resolveNotes);
      } else {
        const token = currentUser.firebaseUid || currentUser.id;
        await fetch(`/api/v1/sos/${activeSos.id}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notes: resolveNotes || 'Resolved by Trip Leader' })
        });
      }
      setResolveNotes('');
      await fetchActiveSosFromBackend();
    } catch (e: any) {
      alert(e.message || 'Failed to resolve SOS');
    } finally {
      setIsResolving(false);
    }
  };

  // 1. LOADING STATE
  if (loadingState === 'LOADING') {
    return (
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-10 shadow-2xl space-y-4 text-center font-mono" id="leader-sos-loading">
        <div className="flex items-center justify-center space-x-3 text-[#4ADE80]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold">Connecting to Incident Command Network...</span>
        </div>
        <p className="text-xs text-slate-400">Synchronizing live SOS telemetry with SafeRoad+ dispatch service...</p>
      </div>
    );
  }

  // 2. ERROR STATE
  if (loadingState === 'ERROR') {
    return (
      <div className="bg-red-950/40 border border-red-800 rounded-xl p-6 shadow-2xl space-y-4 font-mono" id="leader-sos-error">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-200">Incident Command Sync Error</h3>
            <p className="text-xs text-red-400">{errorMessage || 'An error occurred while communicating with the backend.'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 pt-1">
          <button
            onClick={() => {
              setLoadingState('LOADING');
              fetchActiveSosFromBackend();
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. EMPTY STATE (NO ACTIVE SOS)
  if (!activeSos || activeSos.status === 'RESOLVED' || activeSos.status === 'CANCELLED') {
    return (
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow-2xl space-y-6 font-mono" id="leader-sos-empty">
        <div className="flex items-center justify-between border-b border-[#2D3139] pb-4">
          <div className="flex items-center space-x-2.5">
            <Shield className="w-4 h-4 text-[#4ADE80]" />
            <h3 className="text-sm font-bold text-white">Leader Incident Command</h3>
          </div>
          <span className="text-xs font-bold text-[#4ADE80] bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded">
            All Clear • Normal Operations
          </span>
        </div>

        <div className="py-8 text-center space-y-2 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-[#11141A] border border-[#2D3139] text-[#4ADE80] flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">No Active SOS Distresses</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            All expedition members are reporting safe status within the geofence perimeter. If any traveler triggers an emergency distress beacon, real-time telemetry and dispatch escalations will instantly appear here.
          </p>
        </div>

        {/* Development Diagnostics Bar */}
        <div className="border-t border-[#2D3139] pt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Backend Telemetry Polling: Active (3s)</span>
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="text-[#4ADE80] hover:text-emerald-400 font-semibold"
          >
            {showDiagnostics ? 'Hide Diagnostics' : 'View Network Diagnostics'}
          </button>
        </div>

        {showDiagnostics && diagnostics && (
          <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 text-xs space-y-1 font-mono text-slate-300">
            <div>BACKEND: <span className="font-bold text-[#4ADE80]">{diagnostics.status}</span> ({diagnostics.backendService})</div>
            <div>DATABASE: <span className="font-bold text-[#4ADE80]">{diagnostics.database?.status}</span> (Total Records: {diagnostics.database?.totalSosRecords})</div>
            <div>ACTIVE INCIDENTS: <span className="font-bold text-amber-400">{diagnostics.database?.activeSosRecords}</span></div>
          </div>
        )}
      </div>
    );
  }

  // 4. ACTIVE STATE (ACTIVE SOS CARD)
  const isAcknowledged = activeSos.acknowledgements && activeSos.acknowledgements.length > 0;
  const isEscalated = activeSos.status === 'ESCALATED';

  return (
    <div className="bg-[#0F1218] border-2 border-red-600 rounded-xl p-6 sm:p-7 shadow-2xl space-y-6 animate-fade-in font-mono" id="leader-sos-active-card">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D3139] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-md animate-pulse">
            🚨
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-extrabold text-red-400 tracking-tight">Active SOS Emergency Incident</span>
              <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded uppercase">
                {activeSos.status}
              </span>
            </div>
            <span className="text-xs text-slate-500">Incident ID: {activeSos.id}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-red-300 bg-red-950/60 px-3 py-1 rounded-lg border border-red-800 font-bold">
            Distance to Leader: {distanceMeters !== null ? `±${distanceMeters}m` : 'GPS Calibrating...'}
          </span>
          <button
            onClick={fetchActiveSosFromBackend}
            className="p-2 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] rounded-lg text-slate-300 transition-colors"
            title="Refresh Incident State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Incident Core Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Victim Information */}
        <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Traveler in Distress</span>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">{activeSos.userName}</h4>
            <span className="text-[10px] bg-emerald-950/60 text-[#4ADE80] border border-emerald-800 px-2 py-0.5 rounded font-bold">
              {activeSos.role}
            </span>
          </div>
          <p className="text-xs text-slate-300 flex items-center space-x-1.5 font-medium">
            <Phone className="w-3.5 h-3.5 text-[#4ADE80]" />
            <span>{activeSos.userPhone}</span>
          </p>
          <p className="text-[11px] text-slate-400 flex items-center space-x-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Alert Time: {new Date(activeSos.createdAt).toLocaleTimeString()}</span>
          </p>
        </div>

        {/* GPS Location & Telemetry */}
        <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">GPS Telemetry</span>
          <div className="text-xs font-mono text-slate-300">
            <div>LAT: <span className="font-bold text-white">{activeSos.latitude.toFixed(5)}</span></div>
            <div>LNG: <span className="font-bold text-white">{activeSos.longitude.toFixed(5)}</span></div>
          </div>
          <div className="text-[11px] text-slate-400">
            Accuracy: ±{activeSos.accuracy?.toFixed(0) || 8}m • {activeSos.isLastKnownLocation ? 'Last Known Fix' : 'Live High-Precision Fix'}
          </div>
        </div>

        {/* Emergency Contact & FCM Status */}
        <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Dispatch & Broadcast Status</span>
          <div className="text-xs space-y-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Contact Alert:</span>
              <span className={`font-bold ${activeSos.emergencyContactNotified ? 'text-[#4ADE80]' : 'text-amber-400'}`}>
                {activeSos.emergencyContactNotified ? 'Dispatched' : activeSos.emergencyContactDetails?.deliveryStatus || 'Not Configured'}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Group Broadcast:</span>
              <span className="font-bold text-[#4ADE80]">
                {activeSos.recipientDeliveryStatus?.filter(r => r.delivered).length || 0} / {activeSos.recipientDeliveryStatus?.length || 0} Delivered
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded MapLibre Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center space-x-1.5">
            <MapPin className="w-4 h-4 text-red-500" />
            <span>Incident Location Visualizer</span>
          </span>
          {onViewOnMap && (
            <button
              onClick={() => onViewOnMap(activeSos.latitude, activeSos.longitude)}
              className="text-[#4ADE80] hover:text-emerald-400 text-xs font-semibold flex items-center space-x-1"
            >
              <span>Open in Fullscreen Map</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
        <div
          ref={miniMapContainerRef}
          className="w-full h-52 bg-[#11141A] border border-[#2D3139] rounded-lg relative overflow-hidden"
          id="leader-sos-mini-map"
        />
      </div>

      {/* Victim Medical Information */}
      <div className="border border-[#2D3139] rounded-lg bg-[#11141A] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HeartPulse className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-white">Emergency Medical Profile</span>
            <span className="text-[10px] bg-red-950/60 text-red-400 border border-red-800 px-2 py-0.5 rounded font-bold">
              Leader Authorized Access
            </span>
          </div>
          <button
            onClick={() => setShowMedical(!showMedical)}
            className="text-xs text-[#4ADE80] hover:text-emerald-400 font-semibold"
          >
            {showMedical ? 'Collapse' : 'View Medical Profile'}
          </button>
        </div>

        {showMedical && victimMedical && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#2D3139] text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Blood Group</span>
              <span className="font-bold text-white">{victimMedical.bloodGroup || 'Not Specified'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Pre-existing Conditions</span>
              <span className="text-slate-300">{victimMedical.medicalConditions || 'None reported'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Allergies</span>
              <span className="text-amber-400 font-bold">{victimMedical.allergies || 'None reported'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Leader Action Buttons */}
      <div className="border-t border-[#2D3139] pt-5 space-y-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide block">
          Incident Response Actions
        </span>

        <div className="flex flex-wrap gap-2.5">
          {/* 1. View Location */}
          {onViewOnMap && (
            <button
              onClick={() => onViewOnMap(activeSos.latitude, activeSos.longitude)}
              className="bg-[#1A1D24] hover:bg-[#252932] text-slate-200 border border-[#2D3139] text-xs font-bold px-4 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors"
              id="leader-btn-view-loc"
            >
              <Navigation className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Locate on Map</span>
            </button>
          )}

          {/* 2. Acknowledge Button */}
          {!isAcknowledged && (
            <button
              onClick={handleAcknowledgeClick}
              disabled={isAcknowledging}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
              id="leader-btn-acknowledge"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isAcknowledging ? 'Acknowledging...' : 'Acknowledge SOS Alert'}</span>
            </button>
          )}

          {isAcknowledged && (
            <div className="bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-bold px-3.5 py-2.5 rounded-lg flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-amber-400" />
              <span>Acknowledged by Leader</span>
            </div>
          )}

          {/* 3. Escalate to Authorities */}
          {!isEscalated && (
            <div className="flex items-center space-x-1.5">
              <select
                value={selectedAuthority}
                onChange={(e) => setSelectedAuthority(e.target.value as AuthorityType)}
                className="bg-[#11141A] border border-[#2D3139] rounded-lg text-white text-xs px-3 py-2.5 focus:outline-none focus:border-red-500"
                id="leader-select-authority"
              >
                <option value="POLICE">Police Emergency (112)</option>
                <option value="HOSPITAL">Ambulance / Hospital (108)</option>
                <option value="FIRE">Fire Rescue (101)</option>
                <option value="TOURIST_HELPLINE">Tourist Helpline (1363)</option>
              </select>

              <button
                onClick={handleEscalateClick}
                disabled={isEscalating}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
                id="leader-btn-escalate"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{isEscalating ? 'Escalating...' : 'Escalate to Authority'}</span>
              </button>
            </div>
          )}

          {isEscalated && (
            <div className="bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold px-3.5 py-2.5 rounded-lg flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Escalated to Official Emergency Dispatch</span>
            </div>
          )}
        </div>

        {/* 4. Resolve Controls */}
        <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-3.5 flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="Enter resolution summary (e.g., Traveler located safely, team regrouped)..."
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            className="bg-[#0F1218] border border-[#2D3139] rounded-lg text-xs text-white px-3.5 py-2.5 w-full focus:outline-none focus:border-[#4ADE80]"
          />
          <button
            onClick={handleResolveClick}
            disabled={isResolving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg whitespace-nowrap transition-colors shadow-sm shrink-0"
            id="leader-btn-resolve"
          >
            {isResolving ? 'Resolving...' : 'Resolve Incident'}
          </button>
        </div>
      </div>
    </div>
  );
};
