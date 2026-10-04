import React, { useState, useEffect } from 'react';
import { Trip, TripMember, UserProfile, VerifiedHotel, TripState, SOSRecord, AuthorityType } from '../types';
import {
  PlusCircle,
  KeyRound,
  Building2,
  Calendar,
  Users,
  Shield,
  ArrowRight,
  AlertCircle,
  Trash2,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  Compass,
  Crown,
  Search,
  Car,
  Bus,
  Train,
  Plane,
  Star
} from 'lucide-react';
import { LeaderSosCommand } from './LeaderSosCommand';
import { TripReviewModal } from './TripReviewModal';
import { TripReviewPromptModal } from './TripReviewPromptModal';
import { DestinationCommunitySafetyModal } from './DestinationCommunitySafetyModal';
import { TripReview } from '../types';

interface TripManagementProps {
  activeTrip: Trip | null;
  members: TripMember[];
  currentUser: UserProfile;
  activeSos?: SOSRecord | null;
  initialSubTab?: 'sos' | 'current' | 'create' | 'join' | 'completed';
  onCreateTrip: (data: any) => Promise<void>;
  onJoinTrip: (code: string) => Promise<void>;
  onUpdateTripState: (newState: TripState) => Promise<void>;
  onTransferLeadership: (newLeaderUserId: string) => Promise<void>;
  onArchiveTrip: () => Promise<void>;
  onSearchHotels: (destination: string, query?: string) => Promise<VerifiedHotel[]>;
  onGetAiHotelRecommendations?: (
    destination: string,
    preferences?: { budgetTier?: string; groupSize?: number; priority?: string },
    queryHotelName?: string
  ) => Promise<VerifiedHotel[]>;
  onAcknowledgeSos?: (sosId: string) => Promise<void>;
  onEscalateSos?: (sosId: string, authority: AuthorityType) => Promise<void>;
  onResolveSos?: (sosId: string, notes?: string) => Promise<void>;
  onViewLocationOnMap?: (lat: number, lng: number) => void;
}

export const TripManagement: React.FC<TripManagementProps> = ({
  activeTrip,
  members,
  currentUser,
  activeSos,
  initialSubTab = 'current',
  onCreateTrip,
  onJoinTrip,
  onUpdateTripState,
  onTransferLeadership,
  onArchiveTrip,
  onSearchHotels,
  onGetAiHotelRecommendations,
  onAcknowledgeSos,
  onEscalateSos,
  onResolveSos,
  onViewLocationOnMap
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sos' | 'current' | 'create' | 'join' | 'completed'>(initialSubTab);
  const [copiedCode, setCopiedCode] = useState(false);

  // Completed Trips & Review State
  const [completedTripsList, setCompletedTripsList] = useState<{
    trip: Trip;
    membersCount: number;
    hasReviewed: boolean;
    userReview: TripReview | null;
  }[]>([]);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState<boolean>(false);
  const [reviewModalTrip, setReviewModalTrip] = useState<Trip | null>(null);
  const [promptModalTrip, setPromptModalTrip] = useState<Trip | null>(null);
  const [selectedDestForCommunityModal, setSelectedDestForCommunityModal] = useState<string | null>(null);

  const fetchCompletedTrips = async () => {
    if (!currentUser?.firebaseUid) return;
    setIsLoadingCompleted(true);
    try {
      const res = await fetch('/api/v1/trips/completed', {
        headers: {
          Authorization: `Bearer ${currentUser.firebaseUid}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCompletedTripsList(data.completedTrips || []);
      }
    } catch (e) {
      console.warn('Failed to load completed trips:', e);
    } finally {
      setIsLoadingCompleted(false);
    }
  };

  useEffect(() => {
    fetchCompletedTrips();
  }, [currentUser?.firebaseUid, activeTrip?.id]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    const completedTrip = { ...activeTrip, status: 'COMPLETED' as TripState };
    try {
      await onUpdateTripState('COMPLETED');
      setPromptModalTrip(completedTrip);
      fetchCompletedTrips();
    } catch (err: any) {
      alert(err.message || 'Failed to complete trip');
    }
  };

  // Create Form State
  const [destination, setDestination] = useState('');
  const [transportMode, setTransportMode] = useState<'Car' | 'Bus' | 'Train' | 'Flight'>('Car');
  const [targetCount, setTargetCount] = useState(4);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hotelQuery, setHotelQuery] = useState('');
  const [budgetTier, setBudgetTier] = useState('Standard / Safe');
  const [safetyPriority, setSafetyPriority] = useState('24/7 Security & Emergency Access');
  const [searchResults, setSearchResults] = useState<VerifiedHotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<VerifiedHotel | null>(null);
  const [isSearchingHotel, setIsSearchingHotel] = useState(false);
  const [hotelSearchMode, setHotelSearchMode] = useState<'ai' | 'places'>('ai');

  // Join Form State
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLeader = activeTrip && activeTrip.leaderId === currentUser.id;
  const approvedMembers = members.filter(m => m.status === 'APPROVED');
  const hasActiveSos = activeSos && (activeSos.status === 'ACTIVE' || activeSos.status === 'INITIATED' || activeSos.status === 'ACKNOWLEDGED' || activeSos.status === 'ESCALATED');

  const handleCopyCode = () => {
    if (!activeTrip?.code) return;
    navigator.clipboard.writeText(activeTrip.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSearchHotel = async () => {
    if (!destination) return;
    setIsSearchingHotel(true);
    try {
      if (hotelSearchMode === 'ai' && onGetAiHotelRecommendations) {
        const hotels = await onGetAiHotelRecommendations(
          destination,
          { budgetTier, groupSize: targetCount, priority: safetyPriority },
          hotelQuery
        );
        setSearchResults(hotels);
        if (hotels.length > 0) setSelectedHotel(hotels[0]);
      } else {
        const hotels = await onSearchHotels(destination, hotelQuery);
        setSearchResults(hotels);
        if (hotels.length > 0) setSelectedHotel(hotels[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingHotel(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateTrip({
        destination,
        transportMode,
        targetMembersCount: targetCount,
        startDate,
        endDate,
        hotel: selectedHotel
      });
      setActiveSubTab('current');
    } catch (err: any) {
      alert(err.message || 'Failed to create trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setIsSubmitting(true);
    try {
      await onJoinTrip(joinCode);
      setActiveSubTab('current');
      setJoinCode('');
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransportIcon = (mode?: string) => {
    switch (mode) {
      case 'Bus': return <Bus className="w-4 h-4 text-[#4ADE80]" />;
      case 'Train': return <Train className="w-4 h-4 text-[#4ADE80]" />;
      case 'Flight': return <Plane className="w-4 h-4 text-[#4ADE80]" />;
      default: return <Car className="w-4 h-4 text-[#4ADE80]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtab Segmented Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#11141A] rounded-lg border border-[#2D3139] max-w-fit font-mono">
        {/* SOS Incident Command Subtab */}
        <button
          onClick={() => setActiveSubTab('sos')}
          className={`px-4 py-2 rounded-md text-xs font-mono flex items-center space-x-2 transition-all ${
            activeSubTab === 'sos'
              ? hasActiveSos
                ? 'bg-red-600 text-white font-bold'
                : 'bg-[#1A1D24] text-[#4ADE80] border border-[#2D3139] font-bold shadow-sm'
              : hasActiveSos
              ? 'bg-red-950 text-red-400 animate-pulse border border-red-800'
              : 'text-slate-400 hover:text-white hover:bg-[#1A1D24]'
          }`}
          id="subtab-sos-cmd-btn"
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${activeSubTab === 'sos' ? 'fill-current' : hasActiveSos ? 'text-red-500 fill-current' : 'text-slate-500'}`} />
          <span>Incident Command {hasActiveSos ? '(1 ACTIVE)' : ''}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('current')}
          className={`px-4 py-2 rounded-md text-xs font-mono flex items-center space-x-2 transition-all ${
            activeSubTab === 'current'
              ? 'bg-[#1A1D24] text-[#4ADE80] border border-[#2D3139] font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#1A1D24]'
          }`}
          id="subtab-current-btn"
        >
          <Shield className={`w-3.5 h-3.5 ${activeSubTab === 'current' ? 'text-[#4ADE80]' : 'text-slate-500'}`} />
          <span>Active Expedition</span>
        </button>

        <button
          onClick={() => setActiveSubTab('create')}
          className={`px-4 py-2 rounded-md text-xs font-mono flex items-center space-x-2 transition-all ${
            activeSubTab === 'create'
              ? 'bg-[#1A1D24] text-[#4ADE80] border border-[#2D3139] font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#1A1D24]'
          }`}
          id="subtab-create-btn"
        >
          <PlusCircle className={`w-3.5 h-3.5 ${activeSubTab === 'create' ? 'text-[#4ADE80]' : 'text-slate-500'}`} />
          <span>Create Trip</span>
        </button>

        <button
          onClick={() => setActiveSubTab('join')}
          className={`px-4 py-2 rounded-md text-xs font-mono flex items-center space-x-2 transition-all ${
            activeSubTab === 'join'
              ? 'bg-[#1A1D24] text-[#4ADE80] border border-[#2D3139] font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#1A1D24]'
          }`}
          id="subtab-join-btn"
        >
          <KeyRound className={`w-3.5 h-3.5 ${activeSubTab === 'join' ? 'text-[#4ADE80]' : 'text-slate-500'}`} />
          <span>Join with Code</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('completed');
            fetchCompletedTrips();
          }}
          className={`px-4 py-2 rounded-md text-xs font-mono flex items-center space-x-2 transition-all ${
            activeSubTab === 'completed'
              ? 'bg-[#1A1D24] text-[#4ADE80] border border-[#2D3139] font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#1A1D24]'
          }`}
          id="subtab-completed-btn"
        >
          <Star className={`w-3.5 h-3.5 ${activeSubTab === 'completed' ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
          <span>Completed Trips ({completedTripsList.length})</span>
        </button>
      </div>

      {/* Subtab 0: Leader SOS Command */}
      {activeSubTab === 'sos' && (
        <LeaderSosCommand
          activeTrip={activeTrip}
          currentUser={currentUser}
          activeSos={activeSos}
          members={members}
          onAcknowledge={onAcknowledgeSos}
          onEscalate={onEscalateSos}
          onResolve={onResolveSos}
          onViewOnMap={onViewLocationOnMap}
        />
      )}

      {/* Subtab 1: Active Trip */}
      {activeSubTab === 'current' && (
        <div className="space-y-6 font-mono">
          {/* Active SOS Alert Banner if Active */}
          {hasActiveSos && (
            <div className="border border-red-800 bg-red-950/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <AlertTriangle className="w-4 h-4 fill-white text-red-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-200 uppercase tracking-wide">Emergency SOS Signal Active: {activeSos?.userName}</h4>
                  <p className="text-xs text-red-300">GPS Coordinates: {activeSos?.latitude.toFixed(5)}, {activeSos?.longitude.toFixed(5)}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('sos')}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm shrink-0"
              >
                Open Command Center
              </button>
            </div>
          )}

          {activeTrip ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trip Overview Card */}
              <div className="lg:col-span-2 bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-7 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border font-mono ${
                        activeTrip.status === 'ACTIVE'
                          ? 'bg-emerald-950/60 text-[#4ADE80] border-emerald-800'
                          : activeTrip.status === 'UPCOMING'
                          ? 'bg-blue-950/60 text-blue-400 border-blue-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {activeTrip.status} TRIP
                      </span>
                      <span className="text-xs font-mono text-slate-500">ID: {activeTrip.id}</span>
                    </div>

                    <h2 className="text-2xl font-bold font-sans text-white tracking-tight">{activeTrip.destination}</h2>
                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                      <Calendar className="w-4 h-4 text-[#4ADE80]" />
                      <span>{activeTrip.startDate} — {activeTrip.endDate}</span>
                    </div>
                  </div>

                  {/* Join Code Card */}
                  <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-3.5 text-center min-w-[140px]">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block font-mono">Trip Join Code</span>
                    <div className="flex items-center justify-center space-x-1.5 mt-0.5">
                      <span className="text-xl font-mono font-extrabold text-[#4ADE80] tracking-wider">{activeTrip.code}</span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Copy Code"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hotel & Transport Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 flex flex-col justify-between">
                    <div className="flex items-start space-x-3.5">
                      <div className="p-2 bg-[#1A1D24] text-[#4ADE80] rounded-lg shrink-0 border border-[#2D3139]">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-mono">Verified Lodging</span>
                          {activeTrip.hotel?.safetyScore && (
                            <span className="text-[10px] bg-emerald-950/80 text-[#4ADE80] font-bold border border-emerald-800 px-1.5 py-0.5 rounded">
                              🛡️ {activeTrip.hotel.safetyScore}/100 Safe
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white truncate mt-0.5">{activeTrip.hotel?.name || 'Verified Accommodation'}</h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{activeTrip.hotel?.address || 'Safety checked lodging'}</p>

                        {activeTrip.hotel?.proximityToEmergency && (
                          <p className="text-[10px] text-red-300 mt-1">
                            🏥 {activeTrip.hotel.proximityToEmergency}
                          </p>
                        )}
                      </div>
                    </div>

                    {activeTrip.hotel?.latitude && activeTrip.hotel?.longitude && onViewLocationOnMap && (
                      <button
                        type="button"
                        onClick={() => onViewLocationOnMap(activeTrip.hotel!.latitude, activeTrip.hotel!.longitude)}
                        className="mt-3 text-[11px] text-[#4ADE80] hover:text-emerald-300 font-semibold flex items-center space-x-1 border-t border-[#2D3139] pt-2"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>View Hotel on Expedition Radar</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 flex items-start space-x-3.5">
                    <div className="p-2 bg-[#1A1D24] text-[#4ADE80] rounded-lg shrink-0 border border-[#2D3139]">
                      {getTransportIcon(activeTrip.transportMode)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-mono">Expedition Capacity</span>
                      <h4 className="text-xs font-bold text-white mt-0.5">
                        {approvedMembers.length} / {activeTrip.targetMembersCount} Members Joined
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Transit: {activeTrip.transportMode}</p>
                    </div>
                  </div>
                </div>

                {/* Leader Lifecycle Control Toolbar */}
                {isLeader && (
                  <div className="border-t border-[#2D3139] pt-5 space-y-3 font-mono">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide block">
                      Leader Expedition Controls
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {activeTrip.status === 'UPCOMING' && (
                        <button
                          onClick={() => onUpdateTripState('ACTIVE')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Start Trip & Activate 100m Bubble</span>
                        </button>
                      )}

                      {activeTrip.status === 'ACTIVE' && (
                        <button
                          onClick={handleEndTrip}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>End Trip & Complete</span>
                        </button>
                      )}

                      {activeTrip.status === 'COMPLETED' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setReviewModalTrip(activeTrip)}
                            className="bg-[#4ADE80] hover:bg-emerald-400 text-black font-bold text-xs px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <Star className="w-4 h-4 fill-black" />
                            <span>Review Trip Experience</span>
                          </button>
                          <button
                            onClick={() => setSelectedDestForCommunityModal(activeTrip.destination)}
                            className="bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-300 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <Shield className="w-4 h-4 text-[#4ADE80]" />
                            <span>Community Safety Report</span>
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => onArchiveTrip()}
                        className="bg-[#11141A] hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-[#2D3139] hover:border-red-800 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Members List Panel */}
              <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 shadow-2xl space-y-5 font-mono">
                <div className="flex items-center justify-between border-b border-[#2D3139] pb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-[#4ADE80]" />
                    <h3 className="text-sm font-bold text-white">Trip Members</h3>
                  </div>
                  <span className="text-xs font-bold text-[#4ADE80] bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                    {approvedMembers.length} Active
                  </span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {approvedMembers.length > 0 ? (
                    approvedMembers.map(member => (
                      <div
                        key={member.id}
                        className="bg-[#11141A] hover:bg-[#161922] border border-[#2D3139] rounded-lg p-3 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-[#2D3139] text-[#4ADE80] font-bold text-xs flex items-center justify-center shrink-0">
                            {member.userName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-white text-xs">{member.userName}</span>
                              {member.role === 'LEADER' && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-950 text-amber-400 border border-amber-800">
                                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                                  LEADER
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{member.userPhone || 'Traveler'}</span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-[#4ADE80] bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                          Verified
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No team members yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-2xl font-mono">
              <div className="w-12 h-12 rounded-xl bg-[#1A1D24] border border-[#2D3139] text-[#4ADE80] flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Active Expedition</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You are not currently part of an active trip. Create a new trip session as a leader or join an existing group with a 6-character code.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('create')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors"
                >
                  Create Trip
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('join')}
                  className="px-4 py-2 bg-[#1A1D24] hover:bg-[#252932] text-slate-300 border border-[#2D3139] font-semibold text-xs rounded-lg transition-colors"
                >
                  Join with Code
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Create Trip */}
      {activeSubTab === 'create' && (
        <form onSubmit={handleCreateSubmit} className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow-2xl space-y-6 max-w-2xl font-mono">
          <div className="border-b border-[#2D3139] pb-4">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#4ADE80]">Expedition Setup</span>
            <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">Plan New Trip Expedition</h3>
            <p className="text-xs text-slate-400 mt-1">As the trip creator, you will automatically be assigned as Trip Leader with 100m dynamic bubble anchor controls.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="E.g. Manali, Himachal Pradesh"
                required
                className="w-full bg-[#11141A] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Transport Mode</label>
              <select
                value={transportMode}
                onChange={(e: any) => setTransportMode(e.target.value)}
                className="w-full bg-[#11141A] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] transition-all"
              >
                <option value="Car">Car / SUV</option>
                <option value="Bus">Tour Bus</option>
                <option value="Train">Train</option>
                <option value="Flight">Flight</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Group Size (Capacity)</label>
              <input
                type="number"
                min={2}
                max={20}
                value={targetCount}
                onChange={(e) => setTargetCount(parseInt(e.target.value) || 2)}
                className="w-full bg-[#11141A] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Hotel Search</label>
              <input
                type="text"
                value={hotelQuery}
                onChange={(e) => setHotelQuery(e.target.value)}
                placeholder="E.g. Alpine Resort"
                className="w-full bg-[#11141A] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-[#11141A] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full bg-[#11141A] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] transition-all"
              />
            </div>
          </div>

          {/* AI Hotel Recommendation & Google Places Verification */}
          <div className="border-t border-[#2D3139] pt-5 space-y-4 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold text-[#4ADE80] bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                    AI Hotel Intelligence
                  </span>
                  <label className="text-xs font-bold text-white">
                    Verified Lodging & Safety Checkpoints
                  </label>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  AI scans destination perimeter for 24/7 security, CCTV, and rapid hospital proximity
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-[#11141A] border border-[#2D3139] rounded-lg p-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setHotelSearchMode('ai')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                    hotelSearchMode === 'ai'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🤖 AI Safety Scan
                </button>
                <button
                  type="button"
                  onClick={() => setHotelSearchMode('places')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                    hotelSearchMode === 'places'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📍 Places Directory
                </button>
              </div>
            </div>

            {/* AI Preferences (When AI mode is selected) */}
            {hotelSearchMode === 'ai' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#11141A] border border-[#2D3139] rounded-lg p-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Budget Preference</label>
                  <select
                    value={budgetTier}
                    onChange={(e) => setBudgetTier(e.target.value)}
                    className="w-full bg-[#0F1218] border border-[#2D3139] rounded-md text-white text-xs px-3 py-2 focus:outline-none focus:border-[#4ADE80]"
                  >
                    <option value="Budget / Safe (₹2,000 - ₹4,000)">Budget Friendly & Safe (₹2,000 - ₹4,000)</option>
                    <option value="Standard / Premium Safe (₹4,000 - ₹8,000)">Standard / Premium Safe (₹4,000 - ₹8,000)</option>
                    <option value="Luxury Resort & Spa (₹8,000+)">Luxury Resort & Spa (₹8,000+)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Safety Priority Focus</label>
                  <select
                    value={safetyPriority}
                    onChange={(e) => setSafetyPriority(e.target.value)}
                    className="w-full bg-[#0F1218] border border-[#2D3139] rounded-md text-white text-xs px-3 py-2 focus:outline-none focus:border-[#4ADE80]"
                  >
                    <option value="24/7 Security & Emergency Hospital Corridor">24/7 Security & Emergency Hospital Corridor</option>
                    <option value="Gated Perimeter & Night Security Desk">Gated Perimeter & Night Security Desk</option>
                    <option value="Tourist Police Zone & Well-Lit Access">Tourist Police Zone & Well-Lit Access</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleSearchHotel}
                disabled={isSearchingHotel || !destination}
                className="w-full sm:w-auto text-xs bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-[#4ADE80] font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
                id="search-hotel-btn"
              >
                <Search className={`w-4 h-4 ${isSearchingHotel ? 'animate-spin' : ''}`} />
                <span>{isSearchingHotel ? 'Analyzing Lodging Safety with AI...' : hotelSearchMode === 'ai' ? `Recommend Safe Hotels in ${destination || 'Destination'}` : `Search Places in ${destination || 'Destination'}`}</span>
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Found {searchResults.length} verified accommodation options:</span>
                  {selectedHotel && (
                    <span className="text-[#4ADE80] font-bold">Selected: {selectedHotel.name}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {searchResults.map(hotel => {
                    const isSelected = selectedHotel?.placeId === hotel.placeId;
                    return (
                      <div
                        key={hotel.placeId}
                        onClick={() => setSelectedHotel(hotel)}
                        className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-950/40 border-[#4ADE80] text-white shadow-lg ring-1 ring-[#4ADE80]'
                            : 'bg-[#11141A] border-[#2D3139] text-slate-300 hover:bg-[#161922] hover:border-slate-600'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <h5 className="font-bold text-sm text-white font-sans">{hotel.name}</h5>
                              {hotel.isAiRecommended && (
                                <span className="text-[10px] bg-emerald-900/80 text-[#4ADE80] border border-emerald-700 px-2 py-0.5 rounded font-bold">
                                  ✓ AI Safety Verified
                                </span>
                              )}
                              {hotel.rating && (
                                <span className="text-[10px] bg-amber-950/70 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold">
                                  ★ {hotel.rating}
                                </span>
                              )}
                              {hotel.priceRange && (
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                                  {hotel.priceRange}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{hotel.address}</span>
                            </p>
                          </div>

                          <div className="flex items-center space-x-3 shrink-0">
                            {hotel.safetyScore !== undefined && (
                              <div className="text-center bg-[#0F1218] border border-[#2D3139] rounded-lg px-3 py-1.5">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Safety Score</span>
                                <span className="text-base font-extrabold text-[#4ADE80] font-mono">{hotel.safetyScore}/100</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHotel(hotel);
                              }}
                              className={`text-[11px] font-bold px-3 py-2 rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-[#4ADE80] text-black'
                                  : 'bg-[#1A1D24] text-slate-300 hover:text-white border border-[#2D3139]'
                              }`}
                            >
                              {isSelected ? '✓ Selected' : 'Select'}
                            </button>
                          </div>
                        </div>

                        {/* AI Recommendation Reason & Highlights */}
                        {hotel.aiRecommendationReason && (
                          <p className="mt-2 text-[11px] text-slate-300 bg-[#0F1218]/80 p-2.5 rounded-lg border border-[#2D3139]/60">
                            <span className="text-[#4ADE80] font-bold mr-1">AI Safety Analysis:</span>
                            {hotel.aiRecommendationReason}
                          </p>
                        )}

                        {/* Security Features & Emergency Proximity */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {hotel.proximityToEmergency && (
                            <span className="text-[10px] bg-red-950/50 text-red-300 border border-red-800/80 px-2 py-0.5 rounded font-mono">
                              🏥 {hotel.proximityToEmergency}
                            </span>
                          )}
                          {hotel.securityFeatures?.map((feat, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-[#1A1D24] text-slate-300 border border-[#2D3139] px-2 py-0.5 rounded font-mono"
                            >
                              🛡️ {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3.5 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>Create & Launch Expedition</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Subtab 3: Join Trip */}
      {activeSubTab === 'join' && (
        <form onSubmit={handleJoinSubmit} className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow-2xl space-y-6 max-w-md font-mono">
          <div className="border-b border-[#2D3139] pb-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-[#1A1D24] border border-[#2D3139] text-[#4ADE80] flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Join Trip with Code</h3>
            <p className="text-xs text-slate-400 mt-1">Enter the 6-character alphanumeric code provided by your Expedition Leader.</p>
          </div>

          {joinError && (
            <div className="p-3.5 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-lg flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 text-center">Trip Invitation Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="E.G. SHM802"
              maxLength={6}
              required
              className="w-full bg-[#11141A] border border-[#2D3139] rounded-lg text-[#4ADE80] text-xl font-mono font-extrabold uppercase px-4 py-3 focus:outline-none focus:border-[#4ADE80] tracking-widest text-center"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3.5 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>Join Expedition Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Subtab 4: Completed Trips & Safety Reviews */}
      {activeSubTab === 'completed' && (
        <div className="space-y-6 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2D3139] gap-2">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wider uppercase flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Completed Trips & Experience Reviews</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Submit or review your feedback from completed journeys to assist fellow travelers.
              </p>
            </div>
            <button
              onClick={fetchCompletedTrips}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-[#1A1D24] border border-[#2D3139] rounded-lg transition-colors self-start"
            >
              ↻ Refresh
            </button>
          </div>

          {isLoadingCompleted ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-7 h-7 border-2 border-[#4ADE80] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading completed journeys...</p>
            </div>
          ) : completedTripsList.length === 0 ? (
            <div className="p-10 bg-[#0F1218] border border-[#2D3139] rounded-xl text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Completed Expeditions Yet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Trips appear here once the Trip Leader concludes the expedition. You will then be prompted to review your travel and safety experience.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedTripsList.map(({ trip: compTrip, membersCount, hasReviewed, userReview }) => {
                return (
                  <div
                    key={compTrip.id}
                    className="p-5 bg-[#0F1218] border border-[#2D3139] rounded-xl shadow-xl space-y-4 hover:border-slate-600 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#4ADE80] uppercase tracking-wider bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-[#4ADE80]" />
                          <span>COMPLETED</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-bold">
                          CODE: {compTrip.code}
                        </span>
                      </div>

                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                            <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span>{compTrip.destination}</span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Leader: {compTrip.leaderName} • {membersCount} Members • Transit: {compTrip.transportMode}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-[#141720] border border-[#2D3139] rounded-lg text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>Expedition Dates:</span>
                          <span className="text-white font-bold">{compTrip.startDate || 'Recent'} → {compTrip.endDate || 'Recent'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#1F232D]">
                          <span className="text-slate-400">Review Status:</span>
                          {hasReviewed ? (
                            <span className="font-bold text-amber-400 flex items-center space-x-1">
                              <span>Reviewed</span>
                              <span>{'★'.repeat(userReview?.overallRating || 5)}</span>
                            </span>
                          ) : (
                            <span className="font-bold text-amber-400/90 bg-amber-950/50 border border-amber-800/80 px-2 py-0.5 rounded text-[10px]">
                              Review Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewModalTrip(compTrip)}
                        className={`w-full sm:w-1/2 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 ${
                          hasReviewed
                            ? 'bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-200'
                            : 'bg-[#4ADE80] hover:bg-emerald-400 text-black'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${hasReviewed ? 'text-amber-400 fill-amber-400' : 'fill-black'}`} />
                        <span>{hasReviewed ? 'Edit Your Review' : 'Review Trip'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDestForCommunityModal(compTrip.destination)}
                        className="w-full sm:w-1/2 py-2 px-3 rounded-lg bg-[#141720] hover:bg-[#1E232E] border border-[#2D3139] text-slate-300 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <Shield className="w-3.5 h-3.5 text-[#4ADE80]" />
                        <span>Community Safety</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Review Prompt Modal after Trip Completion */}
      {promptModalTrip && (
        <TripReviewPromptModal
          trip={promptModalTrip}
          isOpen={!!promptModalTrip}
          onReviewTrip={() => {
            const t = promptModalTrip;
            setPromptModalTrip(null);
            setReviewModalTrip(t);
          }}
          onSkipForNow={() => {
            setPromptModalTrip(null);
            setActiveSubTab('completed');
          }}
        />
      )}

      {/* Full Trip Review Experience Modal */}
      {reviewModalTrip && (
        <TripReviewModal
          trip={reviewModalTrip}
          currentUser={currentUser}
          isOpen={!!reviewModalTrip}
          onClose={() => setReviewModalTrip(null)}
          onSubmitted={() => {
            fetchCompletedTrips();
          }}
        />
      )}

      {/* Destination Community Safety Intelligence Modal */}
      {selectedDestForCommunityModal && (
        <DestinationCommunitySafetyModal
          destination={selectedDestForCommunityModal}
          isOpen={!!selectedDestForCommunityModal}
          onClose={() => setSelectedDestForCommunityModal(null)}
        />
      )}
    </div>
  );
};
