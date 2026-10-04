import React, { useState, useEffect } from 'react';
import { SOSRecord, UserProfile, AuthorityType, Trip, TripMember } from '../types';
import { locationTrackingService } from '../utils/locationService';
import {
  AlertTriangle,
  X,
  ShieldAlert,
  PhoneCall,
  HeartPulse,
  Shield,
  Lock,
  FileText,
  Clock,
  Radio,
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
  Compass,
  Phone,
  History,
  CheckCheck,
  ExternalLink,
  BellRing
} from 'lucide-react';

interface SosEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTrip: Trip | null;
  currentUser: UserProfile;
  activeSos: SOSRecord | null;
  onInitiateSos: (lat: number, lng: number, isOffline?: boolean) => Promise<SOSRecord | void>;
  onActivateSos: (sosId: string) => Promise<void>;
  onCancelSos: (sosId: string, reason?: string) => Promise<void>;
  onAcknowledgeSos: (sosId: string) => Promise<void>;
  onEscalateSos: (sosId: string, authority: AuthorityType) => Promise<void>;
  onResolveSos: (sosId: string, notes?: string) => Promise<void>;
  onFetchMedicalInfo: (sosId: string) => Promise<any>;
}

export const SosEmergencyModal: React.FC<SosEmergencyModalProps> = ({
  isOpen,
  onClose,
  activeTrip,
  currentUser,
  activeSos,
  onInitiateSos,
  onActivateSos,
  onCancelSos,
  onAcknowledgeSos,
  onEscalateSos,
  onResolveSos,
  onFetchMedicalInfo
}) => {
  const [showConfirmationPrompt, setShowConfirmationPrompt] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [cancellationReason, setCancellationReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedAuthority, setSelectedAuthority] = useState<AuthorityType>('POLICE');
  const [isEscalating, setIsEscalating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [medicalProfile, setMedicalProfile] = useState<any | null>(null);
  const [medicalAccessError, setMedicalAccessError] = useState('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DELIVERY' | 'MEDICAL' | 'TIMELINE'>('OVERVIEW');

  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isRetryingSms, setIsRetryingSms] = useState(false);
  const [smsRetryFeedback, setSmsRetryFeedback] = useState<string | null>(null);

  const handleRetrySms = async () => {
    if (!activeSos) return;
    setIsRetryingSms(true);
    setSmsRetryFeedback(null);
    try {
      const res = await fetch(`/api/v1/sos/${activeSos.id}/retry-sms`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
      });
      const data = await res.json();
      if (res.ok && data.sos) {
        setSmsRetryFeedback(`SMS re-attempt dispatched (Status: ${data.emergencyContactDetails?.deliveryStatus || 'SENT'})`);
      } else {
        setSmsRetryFeedback(`Retry note: ${data.message || 'Unable to re-attempt SMS'}`);
      }
    } catch (err: any) {
      setSmsRetryFeedback(`Retry notice: ${err.message}`);
    } finally {
      setIsRetryingSms(false);
    }
  };

  // Handle 10-second countdown timer when status is INITIATED
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeSos && activeSos.status === 'INITIATED') {
      const expiresAt = new Date(activeSos.cancellationWindowExpiresAt).getTime();
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0 && activeSos.status === 'INITIATED') {
          onActivateSos(activeSos.id);
        }
      };

      updateTimer();
      timer = setInterval(updateTimer, 500);
    }
    return () => clearInterval(timer);
  }, [activeSos, onActivateSos]);

  if (!isOpen) return null;

  const isLeader = activeTrip && activeTrip.leaderId === currentUser.id;
  const isVictim = activeSos && activeSos.userId === currentUser.id;
  const hasAcknowledged = activeSos?.acknowledgements?.some(a => a.userId === currentUser.id);

  const handleStartSosFlow = () => {
    setTriggerError(null);
    setShowConfirmationPrompt(true);
  };

  const handleConfirmTriggerSos = async () => {
    setTriggerError(null);
    setIsTriggering(true);
    try {
      let targetLat: number | null = null;
      let targetLng: number | null = null;

      try {
        const freshGps = await locationTrackingService.getCurrentPosition();
        targetLat = freshGps.latitude;
        targetLng = freshGps.longitude;
      } catch (gpsErr) {
        const lastKnown = locationTrackingService.getFreshOrStaleLocation();
        if (lastKnown) {
          targetLat = lastKnown.latitude;
          targetLng = lastKnown.longitude;
        }
      }

      if (targetLat === null || targetLng === null) {
        throw new Error('Current location unavailable. Please ensure GPS / location services are enabled on your device to broadcast SOS.');
      }

      await onInitiateSos(targetLat, targetLng, false);
      setShowConfirmationPrompt(false);
    } catch (err: any) {
      setTriggerError(err.message || 'Failed to trigger emergency SOS');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleCancelCountdown = async () => {
    if (activeSos) {
      await onCancelSos(activeSos.id, cancellationReason || 'Cancelled within 10s window by user');
    }
  };

  const handleImmediateActivate = async () => {
    if (activeSos) {
      await onActivateSos(activeSos.id);
    }
  };

  const handleAcknowledge = async () => {
    if (!activeSos) return;
    setIsAcknowledging(true);
    try {
      await onAcknowledgeSos(activeSos.id);
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge SOS');
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleEscalateSubmit = async () => {
    if (!activeSos) return;
    setIsEscalating(true);
    try {
      await onEscalateSos(activeSos.id, selectedAuthority);
    } catch (e: any) {
      alert(e.message || 'Escalation failed');
    } finally {
      setIsEscalating(false);
    }
  };

  const handleResolveSubmit = async () => {
    if (!activeSos) return;
    setIsResolving(true);
    try {
      await onResolveSos(activeSos.id, resolutionNotes || 'Resolved successfully');
    } catch (e: any) {
      alert(e.message || 'Resolve failed');
    } finally {
      setIsResolving(false);
    }
  };

  const handleViewMedicalProfile = async () => {
    if (!activeSos) return;
    setMedicalAccessError('');
    try {
      const data = await onFetchMedicalInfo(activeSos.id);
      setMedicalProfile(data);
      setActiveTab('MEDICAL');
    } catch (err: any) {
      setMedicalAccessError(err.message || 'Access Denied to Medical Records');
      setActiveTab('MEDICAL');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-mono">
      <div className="bg-[#0F1218] border border-[#2D3139] max-w-2xl w-full rounded-xl p-6 sm:p-8 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1D24] transition-colors"
          id="close-sos-modal-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3.5 border-b border-[#2D3139] pb-5">
          <div className="w-11 h-11 rounded-lg bg-red-950/80 border border-red-800 flex items-center justify-center text-red-500 shrink-0 shadow">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-red-400 block font-mono">Incident Response</span>
            <h2 className="text-lg font-bold text-white font-sans">
              SafeRoad+ Emergency SOS Beacon
            </h2>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW A: NO ACTIVE SOS (TRIGGER INITIAL SOS WITH CONFIRMATION)            */}
        {/* ========================================================================= */}
        {(!activeSos || activeSos.status === 'CANCELLED' || activeSos.status === 'RESOLVED') && (
          <div className="space-y-6 py-2">
            {!showConfirmationPrompt ? (
              <div className="space-y-5 text-center">
                <div className="bg-[#11141A] border border-[#2D3139] rounded-xl p-6 sm:p-8 space-y-3">
                  <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                  <h3 className="text-base font-bold text-white font-sans">
                    Emergency Broadcast Dispatch
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                    Triggering an SOS initiates a <strong className="text-white font-bold font-mono">10-second cancellation window</strong> before high-priority notifications are dispatched to all active expedition members and your registered emergency contacts.
                  </p>
                  <div className="pt-3 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-2 font-mono">
                    <span className="bg-[#0A0B0E] px-3 py-1 rounded border border-[#2D3139] font-medium">
                      Trip: {activeTrip?.destination || 'Solo Emergency Beacon'}
                    </span>
                    <span className="bg-[#0A0B0E] px-3 py-1 rounded border border-[#2D3139] font-medium">
                      Role: {isLeader ? 'Trip Leader' : 'Expedition Member'}
                    </span>
                  </div>
                </div>

                {triggerError && (
                  <div className="p-3.5 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-xs text-left flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{triggerError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStartSosFlow}
                  id="trigger-sos-btn"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-4 rounded-lg shadow-xl shadow-red-950 transition-all active:scale-[0.99] flex items-center justify-center space-x-2 font-mono"
                >
                  <AlertTriangle className="w-4 h-4 fill-white text-red-600" />
                  <span>Trigger Emergency SOS Beacon</span>
                </button>
              </div>
            ) : (
              /* Confirmation Prompt */
              <div className="bg-red-950/50 border-2 border-red-600 rounded-xl p-6 space-y-4 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <div>
                  <h3 className="text-base font-bold text-white font-sans">
                    Confirm Emergency SOS Activation?
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                    Are you sure you want to broadcast an emergency distress beacon to all expedition members, the Trip Leader, and registered emergency contacts?
                  </p>
                </div>

                {triggerError && (
                  <div className="p-3 bg-red-900/60 border border-red-700 rounded-lg text-red-200 text-xs text-left flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{triggerError}</span>
                  </div>
                )}

                {/* Emergency SMS Recipients Preview */}
                <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-3 text-left font-mono text-xs space-y-2">
                  <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider">
                    Emergency SMS (Automated Dispatch):
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#4ADE80]" />
                      <span>Trip Leader {activeTrip ? `(${activeTrip.leaderName})` : ''}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#4ADE80]" />
                      <span>Emergency Contact {currentUser.emergencyContact?.name ? `(${currentUser.emergencyContact.name})` : ''}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#4ADE80]" />
                      <span>Team Members {activeTrip ? `(${activeTrip.membersCount || 3} members)` : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isTriggering}
                    onClick={() => setShowConfirmationPrompt(false)}
                    className="w-full bg-[#1A1D24] hover:bg-[#252932] text-slate-200 font-bold text-xs py-3 rounded-lg border border-[#2D3139] transition-colors disabled:opacity-50 font-mono"
                  >
                    No, Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isTriggering}
                    onClick={handleConfirmTriggerSos}
                    id="confirm-sos-btn"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 rounded-lg transition-colors shadow disabled:opacity-50 flex items-center justify-center space-x-1.5 font-mono"
                  >
                    <span>{isTriggering ? 'Dispatching Beacon...' : 'Yes, Activate SOS'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: 10-SECOND CANCELLATION COUNTDOWN                                  */}
        {/* ========================================================================= */}
        {activeSos && activeSos.status === 'INITIATED' && (
          <div className="bg-red-950/50 border-2 border-red-600 rounded-xl p-6 sm:p-8 space-y-6 text-center">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-red-400 block font-mono">
                10-Second Safety Window Active
              </span>
              <div className="text-6xl font-black text-white font-mono my-4 flex items-center justify-center space-x-2">
                <Clock className="w-10 h-10 text-red-500 animate-spin" />
                <span>{countdown}s</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                Distress broadcast will initiate automatically in <strong className="text-white font-mono">{countdown} seconds</strong> unless cancelled.
              </p>
            </div>

            {/* Visual progress bar */}
            <div className="w-full bg-red-950 h-2.5 rounded-full overflow-hidden border border-red-900">
              <div
                className="bg-red-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${(countdown / 10) * 100}%` }}
              />
            </div>

            {isVictim && (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelCountdown}
                  id="cancel-sos-btn"
                  className="w-full bg-[#1A1D24] hover:bg-[#252932] text-red-400 font-bold text-xs py-3.5 rounded-lg border border-red-800 transition-colors shadow uppercase tracking-wider font-mono"
                >
                  Cancel SOS Alert Now
                </button>

                <button
                  type="button"
                  onClick={handleImmediateActivate}
                  className="text-xs text-slate-400 hover:text-white underline transition-colors font-mono"
                >
                  Skip Countdown & Activate Immediately
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW C: ACTIVE / ESCALATED / ACKNOWLEDGED INCIDENT COMMAND DASHBOARD     */}
        {/* ========================================================================= */}
        {activeSos && (activeSos.status === 'ACTIVE' || activeSos.status === 'ACKNOWLEDGED' || activeSos.status === 'ESCALATED' || activeSos.status === 'PENDING_SYNC') && (
          <div className="space-y-5">
            {/* Status Banner */}
            <div className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              activeSos.status === 'ESCALATED'
                ? 'bg-amber-950/50 border-amber-800 text-amber-300'
                : activeSos.status === 'PENDING_SYNC'
                ? 'bg-blue-950/50 border-blue-800 text-blue-300'
                : 'bg-red-950/50 border-red-800 text-red-300'
            }`}>
              <div>
                <div className="flex items-center space-x-2 font-mono">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Status: {activeSos.status}
                  </span>
                  <span className="text-[10px] bg-[#0A0B0E] px-2 py-0.5 rounded border border-current font-bold uppercase">
                    Role: {activeSos.role}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Traveler <strong className="text-white font-bold font-sans">{activeSos.userName}</strong> ({activeSos.userPhone}) triggered active alert.
                </p>
              </div>

              {/* Quick Acknowledge Action */}
              {!isVictim && (
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  disabled={isAcknowledging || hasAcknowledged}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase shrink-0 flex items-center space-x-1.5 transition-colors font-mono ${
                    hasAcknowledged
                      ? 'bg-emerald-950/60 text-[#4ADE80] border border-emerald-800'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
                  }`}
                  id="acknowledge-sos-btn"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{hasAcknowledged ? 'Acknowledged' : 'Acknowledge SOS'}</span>
                </button>
              )}
            </div>

            {/* Automatic Emergency Contact & Multi-Recipient SMS Notification Panel */}
            <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <BellRing className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>Emergency SOS Communication Status</span>
                  </span>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Automated delivery status across all authorized expedition channels.
                  </p>
                </div>
              </div>

              {/* 4-Point Communication Status Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-[#0A0B0E] border border-emerald-900/60 rounded flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ADE80]" />
                  <span className="font-bold">✓ SOS Created</span>
                </div>

                <div className={`p-2.5 bg-[#0A0B0E] border rounded flex items-center space-x-2 ${
                  activeSos.communicationStatus?.tripLeaderNotified !== false
                    ? 'border-emerald-900/60 text-emerald-400'
                    : 'border-amber-900/60 text-amber-400'
                }`}>
                  {activeSos.communicationStatus?.tripLeaderNotified !== false ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ADE80]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  )}
                  <span className="font-bold">
                    {activeSos.communicationStatus?.tripLeaderNotified !== false ? '✓ Trip Leader Notified' : '⚠️ Leader Notice Pending'}
                  </span>
                </div>

                <div className={`p-2.5 bg-[#0A0B0E] border rounded flex items-center space-x-2 ${
                  activeSos.communicationStatus?.smsSubmitted
                    ? 'border-emerald-900/60 text-emerald-400'
                    : 'border-red-900/60 text-red-400'
                }`}>
                  {activeSos.communicationStatus?.smsSubmitted ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ADE80]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  )}
                  <span className="font-bold">
                    {activeSos.communicationStatus?.smsSubmitted ? '✓ SMS Submitted' : '⚠ SMS Failed / Pending'}
                  </span>
                </div>

                <div className={`p-2.5 bg-[#0A0B0E] border rounded flex items-center space-x-2 ${
                  activeSos.communicationStatus?.teamMembersNotified !== false
                    ? 'border-emerald-900/60 text-emerald-400'
                    : 'border-amber-900/60 text-amber-400'
                }`}>
                  {activeSos.communicationStatus?.teamMembersNotified !== false ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ADE80]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  )}
                  <span className="font-bold">
                    {activeSos.communicationStatus?.teamMembersNotified !== false ? '✓ Team Members Notified' : '⚠️ Members Pending'}
                  </span>
                </div>
              </div>

              {/* Explicit Failure Banner when SMS could not be sent */}
              {activeSos.communicationStatus && !activeSos.communicationStatus.smsSubmitted && activeSos.communicationStatus.smsFailureReason && (
                <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-xs font-mono flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-red-200">⚠ SMS could not be sent</strong>
                    <span className="text-[11px] text-red-300">Reason: {activeSos.communicationStatus.smsFailureReason}</span>
                  </div>
                </div>
              )}

              {/* Multi-Recipient Delivery Cards */}
              {activeSos.smsAlertsSummary && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Emergency SMS Recipient Log:
                  </span>
                  <div className="space-y-1.5 font-mono text-xs">
                    {/* 1. Trip Leader */}
                    {activeSos.smsAlertsSummary.tripLeaderSms ? (
                      <div className="p-2.5 bg-[#0A0B0E] border border-[#1F232B] rounded flex items-center justify-between">
                        <div>
                          <span className="text-white font-bold block">
                            Trip Leader: {activeSos.smsAlertsSummary.tripLeaderSms.recipientName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {activeSos.smsAlertsSummary.tripLeaderSms.recipientPhone}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          activeSos.smsAlertsSummary.tripLeaderSms.status === 'SENT' || activeSos.smsAlertsSummary.tripLeaderSms.status === 'DELIVERED'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950/80 text-red-300 border border-red-800'
                        }`}>
                          {activeSos.smsAlertsSummary.tripLeaderSms.status}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 bg-[#0A0B0E] border border-[#1F232B] rounded flex items-center justify-between text-slate-400">
                        <span>Trip Leader: Self (or No Phone Configured)</span>
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">N/A</span>
                      </div>
                    )}

                    {/* 2. Emergency Contact */}
                    {activeSos.smsAlertsSummary.emergencyContactSms ? (
                      <div className="p-2.5 bg-[#0A0B0E] border border-[#1F232B] rounded flex items-center justify-between">
                        <div>
                          <span className="text-white font-bold block">
                            Emergency Contact: {activeSos.smsAlertsSummary.emergencyContactSms.recipientName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {activeSos.smsAlertsSummary.emergencyContactSms.recipientPhone}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          activeSos.smsAlertsSummary.emergencyContactSms.status === 'SENT' || activeSos.smsAlertsSummary.emergencyContactSms.status === 'DELIVERED'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950/80 text-red-300 border border-red-800'
                        }`}>
                          {activeSos.smsAlertsSummary.emergencyContactSms.status}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 bg-[#0A0B0E] border border-amber-900/50 rounded flex items-center justify-between text-amber-400">
                        <span>Emergency Contact: Not Configured in Profile</span>
                        <span className="text-[10px] bg-amber-950 px-2 py-0.5 rounded text-amber-300 border border-amber-800">MISSING</span>
                      </div>
                    )}

                    {/* 3. Team Members */}
                    {activeSos.smsAlertsSummary.teamMembersSms.length > 0 ? (
                      activeSos.smsAlertsSummary.teamMembersSms.map((memberSms, idx) => (
                        <div key={idx} className="p-2 bg-[#0A0B0E] border border-[#1F232B] rounded flex items-center justify-between">
                          <div>
                            <span className="text-white font-medium block">
                              Team Member: {memberSms.recipientName}
                            </span>
                            <span className="text-[11px] text-slate-400">{memberSms.recipientPhone}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            memberSms.status === 'SENT' || memberSms.status === 'DELIVERED'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-red-950/80 text-red-300 border border-red-800'
                          }`}>
                            {memberSms.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 bg-[#0A0B0E] border border-[#1F232B] rounded text-slate-400 flex justify-between">
                        <span>Team Members SMS:</span>
                        <span className="text-[10px] text-slate-400">No other members with mobile numbers</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recipient details & method */}
              <div className="bg-[#0A0B0E] border border-[#1F232B] rounded p-3 text-xs font-mono space-y-1.5">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500">Recipient:</span>
                  <span className="font-bold text-white">
                    {activeSos.emergencyContactDetails?.name || currentUser.emergencyContact?.name || 'Not Configured'}
                    {' '}
                    ({activeSos.emergencyContactDetails?.phone || currentUser.emergencyContact?.phone || 'None'})
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500">Method:</span>
                  <span className="text-slate-200">
                    SafeRoad+ Backend SMS Gateway (Twilio)
                  </span>
                </div>
                {activeSos.emergencyContactDetails?.providerMessageId && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500">Provider Message ID:</span>
                    <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                      {activeSos.emergencyContactDetails.providerMessageId}
                    </span>
                  </div>
                )}
                {activeSos.emergencyContactDetails?.sentAt && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-500">Dispatched At:</span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(activeSos.emergencyContactDetails.sentAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Retry button if failed */}
              {activeSos.emergencyContactDetails?.deliveryStatus === 'FAILED' && (
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRetrySms}
                    disabled={isRetryingSms}
                    className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-700 text-red-200 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors font-mono"
                  >
                    <span>{isRetryingSms ? 'Retrying Dispatch...' : '🔄 Retry Automatic SMS'}</span>
                  </button>
                  {smsRetryFeedback && (
                    <span className="text-[11px] text-slate-400 font-mono">{smsRetryFeedback}</span>
                  )}
                </div>
              )}

              {/* Optional Secondary Manual Sharing Section */}
              {(activeSos.emergencyContactDetails?.phone || currentUser.emergencyContact?.phone || currentUser.medicalInfo?.emergencyContactPhone) && (
                <div className="pt-2 border-t border-[#1F232B] space-y-2">
                  <span className="text-[11px] text-slate-400 font-medium font-sans block">
                    Secondary Communication Channels (Optional Manual Backup):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
                    <a
                      href={`tel:${(activeSos.emergencyContactDetails?.phone || currentUser.emergencyContact?.phone || currentUser.medicalInfo?.emergencyContactPhone || '').replace(/[^0-9+]/g, '')}`}
                      className="px-2.5 py-1.5 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-200 font-semibold rounded-lg flex items-center justify-center space-x-1 transition-colors"
                      id="emergency-call-contact-btn"
                    >
                      <Phone className="w-3 h-3 text-blue-400" />
                      <span>📞 Direct Phone Call</span>
                    </a>

                    <a
                      href={`https://wa.me/${(activeSos.emergencyContactDetails?.phone || currentUser.emergencyContact?.phone || currentUser.medicalInfo?.emergencyContactPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `🚨 *SAFEROAD+ EMERGENCY DISTRESS ALERT!*\n*${activeSos.userName}* activated SOS during *${activeSos.tripName || 'trip'}*.\n\n📍 *GPS Location:* https://www.google.com/maps?q=${activeSos.latitude},${activeSos.longitude}\nLatitude: ${activeSos.latitude.toFixed(5)}, Longitude: ${activeSos.longitude.toFixed(5)}\n📞 *Traveler Direct:* ${activeSos.userPhone}\n\nPlease respond or alert emergency services immediately!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-200 font-semibold rounded-lg flex items-center justify-center space-x-1 transition-colors"
                      id="emergency-whatsapp-contact-btn"
                    >
                      <span>💬 WhatsApp Chat</span>
                    </a>

                    <a
                      href={`sms:${(activeSos.emergencyContactDetails?.phone || currentUser.emergencyContact?.phone || currentUser.medicalInfo?.emergencyContactPhone || '').replace(/[\s\-().]/g, '')}?body=${encodeURIComponent(
                        `🚨 SAFEROAD+ SOS ALERT: ${activeSos.userName} activated SOS during ${activeSos.tripName || 'trip'}.\nLocation: https://www.google.com/maps?q=${activeSos.latitude},${activeSos.longitude}`
                      )}`}
                      className="px-2.5 py-1.5 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-400 hover:text-slate-200 font-semibold rounded-lg flex items-center justify-center space-x-1 transition-colors text-[11px]"
                      id="emergency-sms-backup-btn"
                    >
                      <span>📱 Open SMS (Backup)</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="grid grid-cols-4 gap-1 border-b border-[#2D3139] pb-1 text-xs font-semibold font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('OVERVIEW')}
                className={`py-2 text-center border-b-2 transition-colors ${
                  activeTab === 'OVERVIEW'
                    ? 'border-[#4ADE80] text-[#4ADE80] font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('DELIVERY')}
                className={`py-2 text-center border-b-2 transition-colors ${
                  activeTab === 'DELIVERY'
                    ? 'border-[#4ADE80] text-[#4ADE80] font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Recipients
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('MEDICAL')}
                className={`py-2 text-center border-b-2 transition-colors ${
                  activeTab === 'MEDICAL'
                    ? 'border-[#4ADE80] text-[#4ADE80] font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Medical
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TIMELINE')}
                className={`py-2 text-center border-b-2 transition-colors ${
                  activeTab === 'TIMELINE'
                    ? 'border-[#4ADE80] text-[#4ADE80] font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Timeline
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-4">
                {/* GPS Coordinates Card */}
                <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                      <Compass className="w-3.5 h-3.5 text-[#4ADE80]" />
                      <span>GPS Telemetry Fix</span>
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 font-bold uppercase rounded border font-mono ${
                      activeSos.isLastKnownLocation
                        ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                        : 'bg-emerald-950/60 text-[#4ADE80] border-emerald-800'
                    }`}>
                      {activeSos.isLastKnownLocation ? 'Last Known Location' : 'Live GPS Fix'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs font-mono">
                    <div className="bg-[#0A0B0E] p-2 rounded-lg border border-[#2D3139]">
                      <span className="text-[10px] text-slate-500 block uppercase">Latitude</span>
                      <span className="text-white font-bold">{activeSos.latitude.toFixed(5)}</span>
                    </div>
                    <div className="bg-[#0A0B0E] p-2 rounded-lg border border-[#2D3139]">
                      <span className="text-[10px] text-slate-500 block uppercase">Longitude</span>
                      <span className="text-white font-bold">{activeSos.longitude.toFixed(5)}</span>
                    </div>
                    <div className="bg-[#0A0B0E] p-2 rounded-lg border border-[#2D3139]">
                      <span className="text-[10px] text-slate-500 block uppercase">Accuracy</span>
                      <span className="text-white font-bold">±{activeSos.accuracy.toFixed(0)}m</span>
                    </div>
                  </div>
                </div>

                {/* Acknowledgements List */}
                <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-2">
                  <span className="text-xs font-bold text-white block font-mono">
                    Acknowledgements ({activeSos.acknowledgements?.length || 0})
                  </span>
                  {activeSos.acknowledgements && activeSos.acknowledgements.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeSos.acknowledgements.map((ack, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-[#0A0B0E] p-2.5 rounded-lg border border-[#2D3139] font-mono">
                          <span className="text-white font-bold flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                            <span>{ack.userName} ({ack.role})</span>
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(ack.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic block font-mono">No member acknowledgements recorded yet.</span>
                  )}
                </div>

                {/* Leader Escalation Controls */}
                {isLeader && activeSos.status !== 'ESCALATED' && (
                  <div className="bg-amber-950/30 border border-amber-800 rounded-lg p-4 space-y-3 font-mono">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                      <span>Leader Emergency Escalation</span>
                    </h4>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'POLICE', label: 'Police (112)' },
                        { id: 'HOSPITAL', label: 'Hospital (108)' },
                        { id: 'FIRE_RESCUE', label: 'Fire & Rescue (101)' }
                      ].map(auth => (
                        <button
                          key={auth.id}
                          type="button"
                          onClick={() => setSelectedAuthority(auth.id as AuthorityType)}
                          className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                            selectedAuthority === auth.id
                              ? 'bg-amber-600 text-white border-amber-600 shadow'
                              : 'bg-[#11141A] text-slate-400 border-[#2D3139] hover:text-white'
                          }`}
                        >
                          {auth.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleEscalateSubmit}
                      disabled={isEscalating}
                      id="escalate-sos-btn"
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors font-mono"
                    >
                      Escalate to {selectedAuthority}
                    </button>
                  </div>
                )}

                {/* Resolution Controls (Leader or Victim) */}
                {(isLeader || isVictim) && (
                  <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-3 font-mono">
                    <span className="text-xs font-bold text-white block">
                      Resolve Emergency Incident
                    </span>
                    <input
                      type="text"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Enter incident resolution summary notes..."
                      className="w-full bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
                    />
                    <button
                      type="button"
                      onClick={handleResolveSubmit}
                      disabled={isResolving}
                      id="resolve-sos-btn"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors"
                    >
                      Mark Incident as Resolved
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RECIPIENTS & DELIVERY AUDIT */}
            {activeTab === 'DELIVERY' && (
              <div className="space-y-4 font-mono">
                {/* Emergency Contact Status */}
                <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#4ADE80]" />
                      <span>Registered Emergency Contact Dispatch</span>
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 font-bold uppercase rounded border ${
                      activeSos.emergencyContactNotified
                        ? 'bg-emerald-950/60 text-[#4ADE80] border-emerald-800'
                        : 'bg-amber-950/60 text-amber-400 border-amber-800'
                    }`}>
                      {activeSos.emergencyContactNotified ? 'Dispatched' : 'Pending'}
                    </span>
                  </div>

                  {activeSos.emergencyContactDetails ? (
                    <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-3.5 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Name:</span>
                        <span className="text-white font-bold">{activeSos.emergencyContactDetails.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phone:</span>
                        <span className="text-slate-300">{activeSos.emergencyContactDetails.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Primary Channel:</span>
                        <span className="text-slate-300">Automatic Backend SMS ({activeSos.emergencyContactDetails.method || 'SMS Gateway'})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Delivery Status:</span>
                        <span className={`font-bold ${
                          activeSos.emergencyContactDetails.deliveryStatus === 'DELIVERED' || activeSos.emergencyContactDetails.deliveryStatus === 'SENT' || activeSos.emergencyContactDetails.deliveryStatus === 'QUEUED'
                            ? 'text-[#4ADE80]'
                            : 'text-red-400'
                        }`}>
                          {activeSos.emergencyContactDetails.deliveryStatus}
                        </span>
                      </div>
                      {activeSos.emergencyContactDetails.providerMessageId && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Provider Message SID:</span>
                          <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                            {activeSos.emergencyContactDetails.providerMessageId}
                          </span>
                        </div>
                      )}
                      {activeSos.emergencyContactDetails.failureReason && (
                        <div className="flex justify-between">
                          <span className="text-red-400">Failure Reason:</span>
                          <span className="text-red-300 text-[11px] truncate max-w-[240px]">
                            {activeSos.emergencyContactDetails.failureReason}
                          </span>
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-[#1F232B] space-y-1.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-sans">
                          Secondary Manual Backup (Optional):
                        </span>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <a
                            href={`tel:${activeSos.emergencyContactDetails.phone.replace(/[^0-9+]/g, '')}`}
                            className="p-2 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] rounded-lg text-slate-200 font-semibold text-center flex items-center justify-center space-x-1"
                          >
                            <Phone className="w-3 h-3 text-blue-400" />
                            <span>Call</span>
                          </a>
                          <a
                            href={`https://wa.me/${activeSos.emergencyContactDetails.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `🚨 *SAFEROAD+ EMERGENCY ALERT!*\n*${activeSos.userName}* activated SOS during *${activeSos.tripName || 'trip'}*.\n\n📍 Map: https://www.google.com/maps?q=${activeSos.latitude},${activeSos.longitude}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] rounded-lg text-slate-200 font-semibold text-center flex items-center justify-center space-x-1"
                          >
                            <span>WhatsApp</span>
                          </a>
                          <a
                            href={`sms:${activeSos.emergencyContactDetails.phone.replace(/[\s\-().]/g, '')}?body=${encodeURIComponent(
                              `🚨 SAFEROAD+ EMERGENCY DISTRESS ALERT!\n${activeSos.userName} activated SOS during ${activeSos.tripName || 'trip'}.\nLocation: https://www.google.com/maps?q=${activeSos.latitude},${activeSos.longitude}`
                            )}`}
                            className="p-2 bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] rounded-lg text-slate-400 hover:text-slate-200 font-semibold text-center flex items-center justify-center space-x-1 text-[11px]"
                          >
                            <span>SMS App</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No emergency contact registered in user profile.</p>
                  )}
                </div>

                {/* FCM Trip Member Recipients */}
                <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-2.5">
                  <span className="text-xs font-bold text-white block">
                    FCM High Priority Member Dispatch Log ({activeSos.recipientDeliveryStatus?.length || 0})
                  </span>

                  {activeSos.recipientDeliveryStatus && activeSos.recipientDeliveryStatus.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeSos.recipientDeliveryStatus.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-[#0A0B0E] p-2.5 rounded-lg border border-[#2D3139]">
                          <div>
                            <span className="text-white font-bold">{r.userName}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5">({r.role})</span>
                          </div>

                          <div className="text-right">
                            <span className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded border ${
                              r.delivered
                                ? 'bg-emerald-950/60 text-[#4ADE80] border-emerald-800'
                                : 'bg-red-950/60 text-red-400 border-red-800'
                            }`}>
                              {r.delivered ? 'FCM Pushed' : 'Token Fallback'}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {new Date(r.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No member push events recorded.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: MEDICAL PRIVACY ACCESS */}
            {activeTab === 'MEDICAL' && (
              <div className="space-y-4 font-mono">
                <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#4ADE80]" />
                      <span>Encrypted Medical Telemetry</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleViewMedicalProfile}
                      id="view-medical-btn"
                      className="text-xs text-[#4ADE80] hover:text-emerald-300 font-bold uppercase flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Fetch Medical Data</span>
                    </button>
                  </div>

                  {medicalAccessError && (
                    <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-xs text-red-300 space-y-1">
                      <div className="font-bold flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Access Denied</span>
                      </div>
                      <p>{medicalAccessError}</p>
                    </div>
                  )}

                  {medicalProfile && (
                    <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-4 space-y-2.5 text-xs">
                      <div className="flex justify-between border-b border-[#2D3139] pb-2">
                        <span className="text-slate-500">Traveler Name:</span>
                        <span className="text-white font-bold">{medicalProfile.user.name} ({medicalProfile.user.age} y/o, {medicalProfile.user.gender})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Blood Group:</span>
                        <span className="text-[#4ADE80] font-bold">{medicalProfile.medicalInfo.bloodGroup}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Medical Conditions:</span>
                        <span className="text-slate-300">{medicalProfile.medicalInfo.medicalConditions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Allergies:</span>
                        <span className="text-slate-300">{medicalProfile.medicalInfo.allergies}</span>
                      </div>
                      <div className="flex justify-between border-t border-[#2D3139] pt-2">
                        <span className="text-slate-500">Emergency Contact:</span>
                        <span className="text-white font-bold">{medicalProfile.medicalInfo.emergencyContactName} ({medicalProfile.medicalInfo.emergencyContactPhone})</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: TIMELINE */}
            {activeTab === 'TIMELINE' && (
              <div className="space-y-2 bg-[#11141A] border border-[#2D3139] rounded-lg p-4 font-mono">
                <span className="text-xs font-bold text-white block mb-2">
                  Incident Audit Trail ({activeSos.eventHistory?.length || 0})
                </span>

                {activeSos.eventHistory && activeSos.eventHistory.length > 0 ? (
                  <div className="space-y-2">
                    {activeSos.eventHistory.map((evt, i) => (
                      <div key={i} className="text-xs bg-[#0A0B0E] p-3 rounded-lg border border-[#2D3139] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[#4ADE80] font-bold uppercase">{evt.event}</span>
                          <span className="text-[10px] text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                        </div>
                        {evt.actorName && (
                          <span className="text-xs text-slate-400 block">Actor: {evt.actorName}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">No timeline entries recorded.</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
