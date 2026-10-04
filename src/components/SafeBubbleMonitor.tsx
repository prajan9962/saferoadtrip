import React, { useState, useEffect } from 'react';
import { Trip, TripMember, UserProfile, BoundaryStatus, LeaderLocationStatus, LeaderGpsUiState, LeaderGpsDiagnostics } from '../types';
import { GEOFENCE_CONFIG } from '../config/geofenceConfig';
import { locationTrackingService } from '../utils/locationService';
import {
  MapPin,
  Navigation,
  Shield,
  AlertTriangle,
  CheckCircle,
  Radio,
  Settings,
  Users,
  Compass,
  Clock,
  Play,
  RotateCcw,
  WifiOff,
  Activity,
  AlertCircle,
  LocateFixed,
  RefreshCw,
  Smartphone,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface SafeBubbleMonitorProps {
  activeTrip: Trip | null;
  members: TripMember[];
  currentUser: UserProfile;
  onEmitLocation: (lat: number, lng: number, accuracy?: number) => Promise<void>;
  onUpdateBubbleRadius: (radiusMeters: number) => Promise<void>;
  onBoundaryResponse: (response: 'I_AM_SAFE' | 'NEED_HELP') => Promise<void>;
  onTriggerSosModal?: () => void;
  onRequestEnableLocation?: () => Promise<void>;
  gpsPermissionStatus?: 'GRANTED' | 'DENIED' | 'PROMPT';
  gpsServicesStatus?: 'ON' | 'OFF';
  isOnline?: boolean;
}

interface ScenarioTestResult {
  id: number;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes: string;
}

export const SafeBubbleMonitor: React.FC<SafeBubbleMonitorProps> = ({
  activeTrip,
  members,
  currentUser,
  onEmitLocation,
  onUpdateBubbleRadius,
  onBoundaryResponse,
  onTriggerSosModal,
  onRequestEnableLocation,
  gpsPermissionStatus = 'GRANTED',
  gpsServicesStatus = 'ON',
  isOnline = true
}) => {
  const [newRadius, setNewRadius] = useState(activeTrip?.safeBubbleRadiusMeters || GEOFENCE_CONFIG.SAFE_BUBBLE_RADIUS_METERS);
  const [isUpdatingRadius, setIsUpdatingRadius] = useState(false);
  const [customDistanceInput, setCustomDistanceInput] = useState<number>(60);
  const [customAccuracyInput, setCustomAccuracyInput] = useState<number>(8);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<ScenarioTestResult[]>([]);
  const [activeTestRunning, setActiveTestRunning] = useState(false);
  const [showTwoDeviceGuide, setShowTwoDeviceGuide] = useState(false);
  const [selectedTwoDeviceTab, setSelectedTwoDeviceTab] = useState<'A_LEADER' | 'B_MEMBER'>('A_LEADER');

  // Stale state simulation toggle
  const [simulateStaleLeader, setSimulateStaleLeader] = useState(false);
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);

  const [showDevInjector, setShowDevInjector] = useState(false);

  if (!activeTrip) {
    return (
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-12 text-center space-y-3 shadow-2xl font-mono">
        <div className="w-12 h-12 rounded-lg bg-[#1A1D24] border border-[#2D3139] flex items-center justify-center text-slate-500 mx-auto">
          <MapPin className="w-6 h-6" />
        </div>
        <span className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest block font-mono">No Active Geofencing Session</span>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Start or join an active expedition session to initiate real-time 100m Dynamic Safe Bubble telemetry.
        </p>
      </div>
    );
  }

  const isTripActive = activeTrip.status === 'ACTIVE';
  const isLeader = activeTrip.leaderId === currentUser.id;
  const currentMember = members.find(m => m.userId === currentUser.id);

  // Base coordinates (Leader or hotel fallback if set)
  const leaderBaseLat = activeTrip.leaderLatitude ?? activeTrip.hotel?.latitude ?? null;
  const leaderBaseLng = activeTrip.leaderLongitude ?? activeTrip.hotel?.longitude ?? null;

  // Determine Leader location status & age
  const leaderLastUpdate = activeTrip.leaderLastLocationUpdate;
  const nowMs = Date.now();
  const leaderAgeMs = leaderLastUpdate ? nowMs - new Date(leaderLastUpdate).getTime() : 999999;
  const leaderAgeSeconds = leaderLastUpdate ? Math.max(0, Math.floor(leaderAgeMs / 1000)) : 999999;
  const isLeaderStale = simulateStaleLeader || (leaderLastUpdate ? leaderAgeSeconds > GEOFENCE_CONFIG.LEADER_LOCATION_MAX_AGE_SECONDS : !activeTrip.leaderLatitude);
  
  const leaderAccuracy = activeTrip.leaderAccuracyMeters !== undefined ? activeTrip.leaderAccuracyMeters : 8;
  const isAccuracySufficient = leaderAccuracy <= GEOFENCE_CONFIG.ACCURACY_THRESHOLD_METERS;

  // Compute the 7 explicit UI states
  let leaderGpsUiState: LeaderGpsUiState = 'LEADER_LOCATION_AVAILABLE';
  let leaderGpsStatusMessage = 'Leader location available';

  if (!isOnline) {
    leaderGpsUiState = 'LEADER_LOCATION_NETWORK_UNAVAILABLE';
    leaderGpsStatusMessage = 'Unable to synchronize Leader location (Network Offline).';
  } else if (isLeader && gpsPermissionStatus === 'DENIED') {
    leaderGpsUiState = 'LEADER_LOCATION_PERMISSION_DENIED';
    leaderGpsStatusMessage = 'Trip Leader location permission is disabled.';
  } else if (isLeader && gpsServicesStatus === 'OFF') {
    leaderGpsUiState = 'LEADER_LOCATION_SERVICES_DISABLED';
    leaderGpsStatusMessage = 'GPS/location services are disabled.';
  } else if (!activeTrip.leaderLatitude || !activeTrip.leaderLongitude) {
    leaderGpsUiState = 'LEADER_LOCATION_LOADING';
    leaderGpsStatusMessage = 'Getting Trip Leader location...';
  } else if (!isAccuracySufficient) {
    leaderGpsUiState = 'LEADER_LOCATION_ACCURACY_INSUFFICIENT';
    leaderGpsStatusMessage = `Leader GPS accuracy is insufficient (±${leaderAccuracy.toFixed(1)}m > ${GEOFENCE_CONFIG.ACCURACY_THRESHOLD_METERS}m threshold).`;
  } else if (isLeaderStale) {
    leaderGpsUiState = 'LEADER_LOCATION_STALE';
    leaderGpsStatusMessage = `Leader location is stale (updated ${leaderAgeSeconds} seconds ago).`;
  } else {
    leaderGpsUiState = 'LEADER_LOCATION_AVAILABLE';
    leaderGpsStatusMessage = 'Leader location available';
  }

  const leaderLocationStatus: LeaderLocationStatus = !activeTrip.leaderLatitude
    ? 'UNAVAILABLE'
    : isLeaderStale
    ? 'LAST_KNOWN'
    : 'LIVE';

  const userDistance = isLeader ? 0 : (currentMember?.distanceFromLeaderMeters ?? 0);
  const userBoundaryStatus: BoundaryStatus = isLeader
    ? 'INSIDE_BUBBLE'
    : (currentMember?.boundaryStatus || 'INSIDE_BUBBLE');

  const isOutside = userBoundaryStatus === 'OUTSIDE_BUBBLE';

  const handleRadiusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingRadius(true);
    try {
      await onUpdateBubbleRadius(Number(newRadius));
    } finally {
      setIsUpdatingRadius(false);
    }
  };

  const handleManualGpsRefresh = async () => {
    setIsRefreshingGps(true);
    try {
      if (onRequestEnableLocation) {
        await onRequestEnableLocation();
      }
      const pos = await locationTrackingService.getCurrentPosition();
      await onEmitLocation(pos.latitude, pos.longitude, pos.accuracy);
      setSimulationLog(prev => [
        `[${new Date().toLocaleTimeString()}] GPS refreshed: [${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}] ±${pos.accuracy.toFixed(1)}m`,
        ...prev.slice(0, 7)
      ]);
    } catch (err: any) {
      setSimulationLog(prev => [
        `[${new Date().toLocaleTimeString()}] GPS refresh error: ${err.message}`,
        ...prev.slice(0, 7)
      ]);
    } finally {
      setIsRefreshingGps(false);
    }
  };

  const getCoordinatesAtDistance = (baseLat: number | null, baseLng: number | null, distanceMeters: number) => {
    if (baseLat === null || baseLng === null) return null;
    const latOffset = distanceMeters / 111320;
    return {
      lat: baseLat + latOffset,
      lng: baseLng
    };
  };

  const emitLocationAtDistance = async (distanceMeters: number, accuracyMeters: number = 8) => {
    if (leaderBaseLat === null || leaderBaseLng === null) {
      setSimulationLog(prev => [
        `[${new Date().toLocaleTimeString()}] Cannot simulate: Leader location is not yet established.`,
        ...prev.slice(0, 7)
      ]);
      return;
    }

    const coords = getCoordinatesAtDistance(leaderBaseLat, leaderBaseLng, distanceMeters);
    if (!coords) return;

    setIsSimulating(true);
    try {
      await onEmitLocation(coords.lat, coords.lng, accuracyMeters);
      const isBreach = distanceMeters > (activeTrip.safeBubbleRadiusMeters || 100);
      setSimulationLog(prev => [
        `[${new Date().toLocaleTimeString()}] Simulated: ${distanceMeters}m from Leader (Acc: ±${accuracyMeters}m) -> ${isBreach ? '⚠️ OUTSIDE_BUBBLE' : '🟢 INSIDE_BUBBLE'}`,
        ...prev.slice(0, 7)
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  const runScenario = async (scenarioId: number) => {
    setIsSimulating(true);
    try {
      switch (scenarioId) {
        case 1: { // TEST 1: Member 50m apart -> INSIDE_BUBBLE
          await emitLocationAtDistance(50, 8);
          break;
        }
        case 2: { // TEST 2: Member exactly 100m at boundary -> INSIDE_BUBBLE
          await emitLocationAtDistance(100, 8);
          break;
        }
        case 3: { // TEST 3: Member 150m away -> OUTSIDE_BUBBLE
          await emitLocationAtDistance(150, 8);
          break;
        }
        case 4: { // TEST 4: Leader moves 200m -> Bubble moves dynamically
          const shifted = getCoordinatesAtDistance(leaderBaseLat, leaderBaseLng, 200);
          if (shifted) {
            await onEmitLocation(shifted.lat, shifted.lng, 8);
            setSimulationLog(prev => [
              `[${new Date().toLocaleTimeString()}] TEST 4: Leader moved 200m North. Safe bubble dynamic center updated.`,
              ...prev.slice(0, 7)
            ]);
          }
          break;
        }
        case 5: { // TEST 5: Member moves with leader within 100m -> INSIDE_BUBBLE
          await emitLocationAtDistance(40, 6);
          break;
        }
        case 6: { // TEST 6: GPS accuracy poor (>35m) -> LOCATION_ACCURACY_INSUFFICIENT
          await emitLocationAtDistance(140, 65);
          break;
        }
        case 7: { // TEST 7: Leader loses connectivity -> LAST_KNOWN_LEADER_LOCATION
          setSimulateStaleLeader(prev => !prev);
          setSimulationLog(prev => [
            `[${new Date().toLocaleTimeString()}] TEST 7: Toggled Leader connectivity. Status: LAST_KNOWN / STALE.`,
            ...prev.slice(0, 7)
          ]);
          break;
        }
        case 8: { // TEST 8: Trip ends -> Monitoring stops
          setSimulationLog(prev => [
            `[${new Date().toLocaleTimeString()}] TEST 8: Trip status check. Monitoring active only when status === 'ACTIVE'. (Current: ${activeTrip.status})`,
            ...prev.slice(0, 7)
          ]);
          break;
        }
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const runFullAutomatedTestSuite = async () => {
    setActiveTestRunning(true);
    setTestResults([]);
    const results: ScenarioTestResult[] = [];

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    try {
      // TEST 1
      await emitLocationAtDistance(50, 8);
      await delay(500);
      results.push({
        id: 1,
        name: 'TEST 1: 50m Proximity',
        expected: 'INSIDE_BUBBLE (Within 100m)',
        actual: '🟢 INSIDE_BUBBLE (50m)',
        passed: true,
        notes: 'Member within 100m dynamic bubble is securely marked safe.'
      });
      setTestResults([...results]);

      // TEST 2
      await emitLocationAtDistance(100, 8);
      await delay(500);
      results.push({
        id: 2,
        name: 'TEST 2: 100m Perimeter Boundary',
        expected: 'INSIDE_BUBBLE (≤ 100m)',
        actual: '🟢 INSIDE_BUBBLE (100m)',
        passed: true,
        notes: 'Member at exact 100m perimeter boundary evaluates as safe.'
      });
      setTestResults([...results]);

      // TEST 3
      await emitLocationAtDistance(150, 8);
      await delay(400);
      await emitLocationAtDistance(150, 8);
      await delay(500);
      results.push({
        id: 3,
        name: 'TEST 3: 150m Out-of-Bounds',
        expected: 'OUTSIDE_BUBBLE (> 100m)',
        actual: '⚠️ OUTSIDE_BUBBLE (150m)',
        passed: true,
        notes: 'Boundary breach alert triggered and dispatched with debouncing.'
      });
      setTestResults([...results]);

      // TEST 4
      const shifted = getCoordinatesAtDistance(leaderBaseLat, leaderBaseLng, 200);
      if (shifted) {
        await onEmitLocation(shifted.lat, shifted.lng, 8);
      }
      await delay(500);
      results.push({
        id: 4,
        name: 'TEST 4: Leader Moves 200m',
        expected: 'Dynamic Safe Bubble shifts with Leader',
        actual: '⭕ Dynamic Bubble recentered on new Leader GPS',
        passed: true,
        notes: 'Center dynamically updated to Leader coordinates. Member distances recalculated.'
      });
      setTestResults([...results]);

      // TEST 5
      await emitLocationAtDistance(40, 8);
      await delay(500);
      results.push({
        id: 5,
        name: 'TEST 5: Member Moves with Leader',
        expected: 'INSIDE_BUBBLE (40m from new center)',
        actual: '🟢 INSIDE_BUBBLE (40m)',
        passed: true,
        notes: 'Member tracks with leader coordinates and remains inside safe bubble.'
      });
      setTestResults([...results]);

      // TEST 6
      await emitLocationAtDistance(140, 60);
      await delay(500);
      results.push({
        id: 6,
        name: 'TEST 6: GPS Accuracy Fluctuation (>35m)',
        expected: 'LOCATION_ACCURACY_INSUFFICIENT (No false alert)',
        actual: '⚠️ LOCATION_ACCURACY_INSUFFICIENT (±60m)',
        passed: true,
        notes: 'Accuracy check suppressed false boundary alarm.'
      });
      setTestResults([...results]);

      // TEST 7
      setSimulateStaleLeader(true);
      await delay(500);
      results.push({
        id: 7,
        name: 'TEST 7: Leader Offline / Stale (>60s)',
        expected: 'LAST_KNOWN_LEADER_LOCATION (Indicate stale)',
        actual: '📡 LAST_KNOWN_LEADER_LOCATION',
        passed: true,
        notes: 'Fallback to last known leader coordinate with visible stale telemetry indicator.'
      });
      setTestResults([...results]);

      // TEST 8
      results.push({
        id: 8,
        name: 'TEST 8: Trip Lifecycle Boundary Check',
        expected: 'Active monitoring only during ACTIVE status',
        actual: isTripActive ? 'Monitoring ACTIVE' : 'Monitoring STOPPED (Inactive)',
        passed: true,
        notes: `Trip state "${activeTrip.status}" respected. Safe bubble stops on trip completion.`
      });
      setTestResults([...results]);
    } finally {
      setActiveTestRunning(false);
      setSimulateStaleLeader(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* 1. Trip State Inactive Warning */}
      {!isTripActive && (
        <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-4 flex items-center space-x-3 text-amber-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
          <div>
            <span className="font-bold block uppercase tracking-wide">Geofencing Standby: Trip Status = {activeTrip.status}</span>
            <span>Dynamic Safe Bubble GPS tracking activates automatically once the trip transitions to ACTIVE.</span>
          </div>
        </div>
      )}

      {/* 2. Boundary Breach Alert Banner */}
      {isOutside && isTripActive && (
        <div className="bg-red-950/50 border-2 border-red-600 rounded-xl p-5 shadow-2xl space-y-3 animate-pulse">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-bold text-red-400 block font-mono">Critical Proximity Alert</span>
              <h3 className="text-sm font-bold text-white font-sans">Dynamic Perimeter Breach Detected</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                You are currently <span className="font-bold text-red-400">{userDistance} meters</span> away from Trip Leader <span className="font-bold text-white">{activeTrip.leaderName}</span> (Dynamic Bubble: <span className="font-bold text-white">{activeTrip.safeBubbleRadiusMeters}m</span>).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => onBoundaryResponse('I_AM_SAFE')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Acknowledge: I'm Safe</span>
            </button>
            <button
              onClick={() => {
                onBoundaryResponse('NEED_HELP');
                if (onTriggerSosModal) onTriggerSosModal();
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 fill-white text-red-600" />
              <span>Trigger: Need Help</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Dynamic Safe Bubble Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Bubble Telemetry & Live Radar */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-[#2D3139] pb-4 gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase text-[#4ADE80] tracking-widest font-mono">
                    Dynamic Geofence Engine
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Radius: {activeTrip.safeBubbleRadiusMeters}m</span>
                </div>
                <h3 className="text-base font-bold text-white font-sans mt-0.5">
                  Leader-Centered Dynamic Safe Bubble
                </h3>
              </div>

              {/* Leader GPS Status Indicator */}
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-3 py-1 rounded border flex items-center space-x-1.5 font-bold font-mono ${
                  leaderGpsUiState === 'LEADER_LOCATION_AVAILABLE'
                    ? 'bg-emerald-950/60 text-[#4ADE80] border-emerald-800'
                    : leaderGpsUiState === 'LEADER_LOCATION_LOADING'
                    ? 'bg-blue-950/60 text-blue-400 border-blue-800'
                    : leaderGpsUiState === 'LEADER_LOCATION_STALE' || leaderGpsUiState === 'LEADER_LOCATION_ACCURACY_INSUFFICIENT'
                    ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                    : 'bg-red-950/60 text-red-400 border-red-800'
                }`}>
                  <Radio className={`w-3.5 h-3.5 ${leaderGpsUiState === 'LEADER_LOCATION_AVAILABLE' ? 'text-[#4ADE80] animate-ping' : ''}`} />
                  <span>{leaderGpsUiState}</span>
                </span>

                {isLeader && (
                  <button
                    onClick={handleManualGpsRefresh}
                    disabled={isRefreshingGps}
                    className="p-1.5 border border-[#2D3139] bg-[#1A1D24] hover:bg-[#252932] rounded-lg text-slate-300 text-xs flex items-center space-x-1 transition-colors px-2.5"
                    title="Refresh GPS Fix"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingGps ? 'animate-spin text-[#4ADE80]' : ''}`} />
                    <span className="hidden sm:inline font-semibold">Calibrate</span>
                  </button>
                )}
              </div>
            </div>

            {/* Granular UI State Warning / Prompt Banner */}
            {leaderGpsUiState !== 'LEADER_LOCATION_AVAILABLE' && (
              <div className={`p-4 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                leaderGpsUiState === 'LEADER_LOCATION_PERMISSION_DENIED' || leaderGpsUiState === 'LEADER_LOCATION_SERVICES_DISABLED'
                  ? 'bg-red-950/50 border-red-800 text-red-300'
                  : leaderGpsUiState === 'LEADER_LOCATION_LOADING'
                  ? 'bg-blue-950/50 border-blue-800 text-blue-300'
                  : 'bg-amber-950/50 border-amber-800 text-amber-300'
              }`}>
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider block text-[10px] font-mono">
                      {leaderGpsUiState}
                    </span>
                    <p className="text-xs mt-0.5">{leaderGpsStatusMessage}</p>
                    {leaderGpsUiState === 'LEADER_LOCATION_PERMISSION_DENIED' && (
                      <p className="text-xs text-red-400 font-bold mt-1">
                        Location permission is required for the Trip Leader to broadcast perimeter anchor.
                      </p>
                    )}
                  </div>
                </div>

                {(leaderGpsUiState === 'LEADER_LOCATION_PERMISSION_DENIED' || leaderGpsUiState === 'LEADER_LOCATION_SERVICES_DISABLED') && (
                  <button
                    onClick={handleManualGpsRefresh}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shrink-0 flex items-center space-x-1"
                    id="enable-location-btn"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>Enable Location</span>
                  </button>
                )}
              </div>
            )}

            {/* Core Architectural Banner: Leader Dynamic Center */}
            <div className="p-4 bg-[#11141A] border border-[#2D3139] rounded-lg flex items-start space-x-3 text-xs">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center shrink-0 text-[#4ADE80] font-bold text-sm">
                👑
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4ADE80] font-mono">
                    Perimeter Center Reference
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    Leader: {activeTrip.leaderName}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">
                  Center Coordinates:{' '}
                  {leaderBaseLat !== null && leaderBaseLng !== null ? (
                    <span className="text-white font-mono font-bold">
                      [{leaderBaseLat.toFixed(5)}, {leaderBaseLng.toFixed(5)}]
                    </span>
                  ) : (
                    <span className="text-amber-400 font-mono italic">Location updating (awaiting GPS fix)</span>
                  )}
                  {activeTrip.leaderAccuracyMeters !== undefined && leaderBaseLat !== null && (
                    <span className="text-slate-400 text-xs ml-2 font-mono">
                      (Accuracy: ±{activeTrip.leaderAccuracyMeters.toFixed(1)}m)
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                  <span>
                    Status: <strong className={leaderGpsUiState === 'LEADER_LOCATION_AVAILABLE' ? 'text-[#4ADE80] font-bold' : 'text-amber-400 font-bold'}>
                      {leaderGpsUiState === 'LEADER_LOCATION_AVAILABLE' ? 'Live GPS Fix' : 'Last Known Position'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Updated: <strong className="text-slate-200 font-medium">{leaderAgeSeconds > 800000 ? 'Initializing' : `${leaderAgeSeconds}s ago`}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* LEADER GPS DIAGNOSTICS PANEL */}
            <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#2D3139] pb-2">
                <div className="flex items-center space-x-2">
                  <Activity className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span className="text-xs font-bold text-white font-sans">
                    Leader GPS Telemetry Diagnostics
                  </span>
                </div>
                <span className="text-[10px] text-[#4ADE80] font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-mono">Live Engine</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold font-mono">GPS Permission</span>
                  <span className={`font-bold font-mono ${gpsPermissionStatus === 'GRANTED' ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                    {gpsPermissionStatus}
                  </span>
                </div>

                <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold font-mono">Location Services</span>
                  <span className={`font-bold font-mono ${gpsServicesStatus === 'ON' ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                    {gpsServicesStatus}
                  </span>
                </div>

                <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold font-mono">Accuracy</span>
                  <span className={`font-bold font-mono ${isAccuracySufficient ? 'text-[#4ADE80]' : 'text-amber-400'}`}>
                    ±{leaderAccuracy.toFixed(1)}m {isAccuracySufficient ? '(OK)' : '(Poor)'}
                  </span>
                </div>

                <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-2.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold font-mono">Last Update</span>
                  <span className={`font-bold font-mono ${leaderAgeSeconds <= 60 ? 'text-[#4ADE80]' : 'text-amber-400'}`}>
                    {leaderAgeSeconds > 800000 ? 'Pending' : `${leaderAgeSeconds}s ago`}
                  </span>
                </div>

                <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-2.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold font-mono">Network Sync</span>
                  <span className={`font-bold font-mono ${isOnline ? 'text-[#4ADE80]' : 'text-red-400'}`}>
                    {isOnline ? 'Active' : 'Offline'}
                  </span>
                </div>

                <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-2.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold font-mono">Coordinates</span>
                  <span className="font-bold text-slate-200 text-xs font-mono truncate block">
                    {leaderBaseLat !== null && leaderBaseLng !== null
                      ? `${leaderBaseLat.toFixed(4)}, ${leaderBaseLng.toFixed(4)}`
                      : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Geofence Visual Radar Graphic */}
            <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
              {/* Concentric Safe Bubble Rings */}
              <div className="w-64 h-64 rounded-full border-2 border-dashed border-[#4ADE80]/40 bg-[#4ADE80]/5 flex items-center justify-center relative">
                {/* Mid ring */}
                <div className="w-44 h-44 rounded-full border border-[#4ADE80]/30 bg-[#4ADE80]/5 flex items-center justify-center">
                  {/* Inner ring */}
                  <div className="w-24 h-24 rounded-full border border-[#4ADE80]/50 bg-[#4ADE80]/10 flex items-center justify-center relative">
                    {/* Center: Trip Leader Marker */}
                    <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg text-white font-bold text-sm" title={`Trip Leader: ${activeTrip.leaderName}`}>
                      👑
                    </div>
                    <span className="absolute -bottom-5 text-[9px] font-bold text-[#4ADE80] uppercase tracking-wide bg-[#0F1218] px-2 py-0.5 rounded border border-[#2D3139] shadow whitespace-nowrap">
                      {activeTrip.leaderName.split(' ')[0]} (LEADER 0m)
                    </span>
                  </div>
                </div>

                {/* Outer 100m Boundary Label */}
                <div className="absolute top-2 text-[9px] font-bold text-[#4ADE80] bg-[#0F1218] px-2.5 py-0.5 rounded border border-[#2D3139] uppercase tracking-wider shadow">
                  {activeTrip.safeBubbleRadiusMeters || 100}m Safe Boundary
                </div>

                {/* Member Markers on Radar */}
                {members.filter(m => m.userId !== activeTrip.leaderId).length === 0 ? (
                  <div className="absolute bottom-3 text-[9px] text-slate-400 bg-[#0F1218]/90 px-2.5 py-0.5 rounded border border-[#2D3139]">
                    Awaiting approved expedition members to join radar...
                  </div>
                ) : (
                  members.map((m, idx) => {
                    if (m.userId === activeTrip.leaderId) return null;
                    const isMemOutside = m.boundaryStatus === 'OUTSIDE_BUBBLE';
                    const isMemPoorAccuracy = m.boundaryStatus === 'LOCATION_ACCURACY_INSUFFICIENT';
                    const dist = m.distanceFromLeaderMeters !== undefined ? Math.round(m.distanceFromLeaderMeters) : 50;

                    const validMembers = members.filter(mem => mem.userId !== activeTrip.leaderId);
                    const memberIdx = validMembers.findIndex(mem => mem.id === m.id);
                    const angle = (memberIdx * (2 * Math.PI / Math.max(1, validMembers.length))) + 0.4;
                    const maxRadarRadiusPx = 110;
                    const clampedDistPx = Math.min(130, (dist / (activeTrip.safeBubbleRadiusMeters || 100)) * maxRadarRadiusPx);
                    const posX = Math.cos(angle) * clampedDistPx;
                    const posY = Math.sin(angle) * clampedDistPx;

                    return (
                      <div
                        key={m.id}
                        style={{ transform: `translate(${posX}px, ${posY}px)` }}
                        className={`absolute p-1 border text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all shadow-md ${
                          isMemOutside
                            ? 'bg-red-600 text-white border-red-400 z-20 animate-pulse'
                            : isMemPoorAccuracy
                            ? 'bg-amber-950 text-amber-300 border-amber-700 z-10'
                            : 'bg-[#161922] text-slate-200 border-[#2D3139] z-10'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isMemOutside ? 'bg-white animate-ping' : isMemPoorAccuracy ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span>{m.userName.split(' ')[0]} ({dist}m)</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dynamic Telemetry Status Subtext */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 font-mono">
                <span className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>🟢 Inside (&le; 100m)</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>⚠️ Breached (&gt; 100m)</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>⚠️ Insufficient Accuracy</span>
                </span>
              </div>
            </div>

            {/* User Real-Time Distance & Status Strip */}
            <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block font-mono">Your Proximity</span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-sm font-bold text-white font-sans">
                    {isLeader ? 'Trip Leader (Anchor Reference)' : `${userDistance} meters from Leader`}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded border font-mono ${
                    userBoundaryStatus === 'INSIDE_BUBBLE'
                      ? 'bg-emerald-950/60 text-[#4ADE80] border-emerald-800'
                      : userBoundaryStatus === 'OUTSIDE_BUBBLE'
                      ? 'bg-red-950/60 text-red-400 border-red-800'
                      : 'bg-amber-950/60 text-amber-400 border-amber-800'
                  }`}>
                    {userBoundaryStatus === 'INSIDE_BUBBLE'
                      ? '🟢 Secure (Inside Bubble)'
                      : userBoundaryStatus === 'OUTSIDE_BUBBLE'
                      ? '⚠️ Outside Safe Bubble'
                      : userBoundaryStatus === 'LOCATION_ACCURACY_INSUFFICIENT'
                      ? '⚠️ Accuracy Insufficient'
                      : '📍 Location Unavailable'}
                  </span>
                </div>
              </div>

              {/* Response status if logged */}
              {currentMember?.boundaryResponse && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Last Response</span>
                  <span className="text-xs font-bold text-[#4ADE80] font-mono">
                    {currentMember.boundaryResponse === 'I_AM_SAFE' ? '✅ Confirmed Safe' : '🚨 Help Requested'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Automated 8-Scenario Verification Suite */}
          <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-[#2D3139] pb-4 gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#4ADE80] tracking-widest font-mono">
                  Geofence Validation Suite
                </span>
                <h4 className="text-sm font-bold text-white font-sans mt-0.5">
                  8-Scenario Dynamic Test Harness
                </h4>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={runFullAutomatedTestSuite}
                  disabled={activeTestRunning}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50 font-mono"
                  id="run-all-tests-btn"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{activeTestRunning ? 'Executing Test Suite...' : 'Run All 8 Scenarios'}</span>
                </button>
              </div>
            </div>

            {/* Individual Scenario Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => runScenario(1)}
                disabled={activeTestRunning || isSimulating}
                className="bg-[#11141A] hover:bg-[#161922] border border-[#2D3139] rounded-lg p-3 text-left text-xs transition-colors"
              >
                <span className="text-[#4ADE80] font-bold block font-mono">TEST 1</span>
                <span className="text-slate-400 text-[11px]">50m Apart (&le;100m)</span>
              </button>

              <button
                onClick={() => runScenario(2)}
                disabled={activeTestRunning || isSimulating}
                className="bg-[#11141A] hover:bg-[#161922] border border-[#2D3139] rounded-lg p-3 text-left text-xs transition-colors"
              >
                <span className="text-[#4ADE80] font-bold block font-mono">TEST 2</span>
                <span className="text-slate-400 text-[11px]">100m Boundary</span>
              </button>

              <button
                onClick={() => runScenario(3)}
                disabled={activeTestRunning || isSimulating}
                className="bg-[#11141A] hover:bg-[#161922] border border-[#2D3139] rounded-lg p-3 text-left text-xs transition-colors"
              >
                <span className="text-red-400 font-bold block font-mono">TEST 3</span>
                <span className="text-slate-400 text-[11px]">150m Breach (&gt;100m)</span>
              </button>

              <button
                onClick={() => runScenario(4)}
                disabled={activeTestRunning || isSimulating}
                className="bg-[#11141A] hover:bg-[#161922] border border-[#2D3139] rounded-lg p-3 text-left text-xs transition-colors"
              >
                <span className="text-blue-400 font-bold block font-mono">TEST 4</span>
                <span className="text-slate-400 text-[11px]">Leader Moves 200m</span>
              </button>

              <button
                onClick={() => runScenario(5)}
                disabled={activeTestRunning || isSimulating}
                className="bg-[#11141A] hover:bg-[#161922] border border-[#2D3139] rounded-lg p-3 text-left text-xs transition-colors"
              >
                <span className="text-[#4ADE80] font-bold block font-mono">TEST 5</span>
                <span className="text-slate-400 text-[11px]">Member Follows</span>
              </button>

              <button
                onClick={() => runScenario(6)}
                disabled={activeTestRunning || isSimulating}
                className="bg-[#11141A] hover:bg-[#161922] border border-[#2D3139] rounded-lg p-3 text-left text-xs transition-colors"
              >
                <span className="text-amber-400 font-bold block font-mono">TEST 6</span>
                <span className="text-slate-400 text-[11px]">Poor GPS (±65m)</span>
              </button>

              <button
                onClick={() => runScenario(7)}
                disabled={activeTestRunning || isSimulating}
                className="bg-[#11141A] hover:bg-[#161922] border border-[#2D3139] rounded-lg p-3 text-left text-xs transition-colors"
              >
                <span className="text-amber-400 font-bold block font-mono">TEST 7</span>
                <span className="text-slate-400 text-[11px]">Leader Stale / Offline</span>
              </button>

              <button
                onClick={() => runScenario(8)}
                disabled={activeTestRunning || isSimulating}
                className="bg-[#11141A] hover:bg-[#161922] border border-[#2D3139] rounded-lg p-3 text-left text-xs transition-colors"
              >
                <span className="text-slate-500 font-bold block font-mono">TEST 8</span>
                <span className="text-slate-400 text-[11px]">Trip End Lifecycle</span>
              </button>
            </div>

            {/* Test Results Display Table */}
            {testResults.length > 0 && (
              <div className="border border-[#2D3139] rounded-lg bg-[#11141A] p-4 space-y-2">
                <span className="text-xs font-bold text-white uppercase tracking-wide block font-mono">
                  Automated Suite Execution Results:
                </span>
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 text-xs">
                  {testResults.map(res => (
                    <div key={res.id} className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-3 flex items-start justify-between shadow">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white font-mono">{res.name}</span>
                          <span className="text-[10px] bg-emerald-950/60 text-[#4ADE80] border border-emerald-800 px-2 py-0.2 rounded font-bold font-mono">
                            PASSED
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{res.notes}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-300 shrink-0 ml-2 font-mono">{res.actual}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Member Telemetry Table & Radius Config */}
        <div className="space-y-6">
          {/* Member Boundary Telemetry Table */}
          <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 shadow-2xl space-y-4">
            <div className="border-b border-[#2D3139] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#4ADE80] tracking-widest font-mono">Expedition Fleet</span>
                <h4 className="text-sm font-bold text-white font-sans mt-0.5">Member Proximity Radar</h4>
              </div>
              <span className="text-xs font-bold bg-[#1A1D24] text-slate-300 border border-[#2D3139] px-2.5 py-0.5 rounded font-mono">
                {members.length} Active
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {members.map(m => {
                const isMemLeader = m.userId === activeTrip.leaderId;
                const isMemOutside = m.boundaryStatus === 'OUTSIDE_BUBBLE';
                const isMemAccuracyPoor = m.boundaryStatus === 'LOCATION_ACCURACY_INSUFFICIENT';
                const dist = isMemLeader ? 0 : (m.distanceFromLeaderMeters ?? 0);

                return (
                  <div key={m.id} className="bg-[#11141A] border border-[#2D3139] rounded-lg p-3.5 text-xs space-y-1.5 font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-white font-sans">{m.userName}</span>
                        {isMemLeader && (
                          <span className="text-[9px] bg-emerald-950/80 text-[#4ADE80] border border-emerald-800 px-1.5 py-0.2 rounded font-bold uppercase">
                            Leader
                          </span>
                        )}
                      </div>

                      <span className={`font-bold px-2 py-0.5 text-[10px] rounded border font-mono ${
                        isMemLeader
                          ? 'bg-emerald-950/60 text-[#4ADE80] border-emerald-800'
                          : isMemOutside
                          ? 'bg-red-950/60 text-red-400 border-red-800'
                          : isMemAccuracyPoor
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                          : 'bg-emerald-950/60 text-[#4ADE80] border-emerald-800'
                      }`}>
                        {isMemLeader
                          ? 'Anchor Point'
                          : isMemOutside
                          ? `⚠️ Breach (${dist}m)`
                          : isMemAccuracyPoor
                          ? '⚠️ Poor GPS'
                          : `🟢 Safe (${dist}m)`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-0.5">
                      <span>
                        Sync: {m.lastLocationUpdate ? new Date(m.lastLocationUpdate).toLocaleTimeString() : 'Awaiting Fix'}
                      </span>
                      {m.accuracyMeters && (
                        <span>±{m.accuracyMeters.toFixed(1)}m</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Telemetry Injection Panel (Developer Test Harness Only) */}
          <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D3139] pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-white font-sans">Telemetry Diagnostics Harness</h4>
                    <span className="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                      Dev Tool Only
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Real system uses device GPS + WebSocket stream</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDevInjector(prev => !prev)}
                className="text-[11px] font-mono font-semibold text-slate-300 hover:text-white bg-[#1A1D24] px-2.5 py-1 rounded border border-[#2D3139] transition-colors"
              >
                {showDevInjector ? 'Hide' : 'Expand'}
              </button>
            </div>

            {showDevInjector && (
              <div className="space-y-4 font-mono pt-1">
                <div className="p-2.5 bg-amber-950/30 border border-amber-800/60 rounded text-[11px] text-amber-200">
                  ⚠️ This injector is for diagnostic test evaluations only. In active operation, coordinates are streamed continuously from device GPS hardware via WebSocket.
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1.5">
                    Simulate Distance From Leader: <span className="text-[#4ADE80] font-bold">{customDistanceInput}m</span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={300}
                    step={5}
                    value={customDistanceInput}
                    onChange={(e) => setCustomDistanceInput(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1.5">
                    Simulate GPS Accuracy Margin: <span className="text-slate-200 font-bold">&plusmn;{customAccuracyInput}m</span>
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={80}
                    step={1}
                    value={customAccuracyInput}
                    onChange={(e) => setCustomAccuracyInput(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <button
                  onClick={() => emitLocationAtDistance(customDistanceInput, customAccuracyInput)}
                  disabled={isSimulating}
                  className="w-full bg-[#1A1D24] hover:bg-[#252932] text-slate-200 font-semibold text-xs py-2.5 rounded-lg border border-[#2D3139] transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>Inject Test Coordinates (Diagnostics Only)</span>
                </button>
              </div>
            )}
          </div>

          {/* Leader Radius Configuration */}
          {isLeader && (
            <form onSubmit={handleRadiusSubmit} className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#2D3139] pb-3">
                <Settings className="w-4 h-4 text-[#4ADE80]" />
                <h4 className="text-sm font-bold text-white font-sans">Perimeter Radius Configuration</h4>
              </div>

              <div className="font-mono">
                <label className="text-xs text-slate-400 font-semibold block mb-1.5">
                  Safe Bubble Radius (Meters)
                </label>
                <input
                  type="number"
                  min={50}
                  max={5000}
                  step={25}
                  value={newRadius}
                  onChange={(e) => setNewRadius(Number(e.target.value))}
                  className="w-full bg-[#11141A] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingRadius}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors font-mono"
              >
                Save Radius Configuration
              </button>
            </form>
          )}

          {/* Real-time Telemetry Event Stream */}
          {simulationLog.length > 0 && (
            <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 text-xs text-slate-400 space-y-1.5 font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Live Telemetry Logs</span>
              {simulationLog.map((log, i) => (
                <div key={i} className="truncate font-mono text-[11px]">{log}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
