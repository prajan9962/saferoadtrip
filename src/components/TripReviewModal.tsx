import React, { useState, useEffect } from 'react';
import {
  Trip,
  UserProfile,
  TripReview,
  OverallRating,
  SafetyRating,
  RouteRating,
  RouteFeltSafe,
  SafetyIssueType
} from '../types';
import {
  Star,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  MapPin,
  Route,
  Radio,
  Bell,
  Phone,
  WifiOff,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

interface TripReviewModalProps {
  trip: Trip;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (review: TripReview) => void;
}

const OVERALL_RATING_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent'
};

const SAFETY_RATING_LABELS: Record<number, { text: string; color: string; bg: string }> = {
  1: { text: 'Very Unsafe', color: 'text-red-400', bg: 'bg-red-950/60 border-red-800' },
  2: { text: 'Unsafe', color: 'text-orange-400', bg: 'bg-orange-950/60 border-orange-800' },
  3: { text: 'Neutral', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-800' },
  4: { text: 'Safe', color: 'text-lime-400', bg: 'bg-lime-950/60 border-lime-800' },
  5: { text: 'Very Safe', color: 'text-[#4ADE80]', bg: 'bg-emerald-950/60 border-emerald-800' }
};

const DESTINATION_EXPERIENCE_OPTIONS = [
  'Safe environment',
  'Heavy crowd',
  'Poor road conditions',
  'Traffic issues',
  'Unsafe area',
  'Helpful local support',
  'Emergency assistance required',
  'No major issues',
  'Other'
];

const SAFETY_FEATURES_LIST = [
  { key: 'aiSafetyGuide', label: 'AI Safety Guide', icon: Sparkles },
  { key: 'safeRouteRecommendation', label: 'Safe Route Recommendation', icon: Route },
  { key: 'smartSafeBubble', label: 'Smart Safe Bubble', icon: Radio },
  { key: 'safetyAlerts', label: 'Safety Alerts', icon: Bell },
  { key: 'sosEmergencySupport', label: 'SOS / Emergency Support', icon: Phone },
  { key: 'offlineSafetyFeatures', label: 'Offline Safety Features', icon: WifiOff }
] as const;

export const TripReviewModal: React.FC<TripReviewModalProps> = ({
  trip,
  currentUser,
  isOpen,
  onClose,
  onSubmitted
}) => {
  // Section 1: Overall experience (1-5)
  const [overallRating, setOverallRating] = useState<OverallRating>(5);
  const [hoveredOverallStar, setHoveredOverallStar] = useState<number | null>(null);

  // Section 2: Safety experience (1-5)
  const [safetyRating, setSafetyRating] = useState<SafetyRating>(5);

  // Section 3: Route experience
  const [routeRating, setRouteRating] = useState<RouteRating>('Good');
  const [routeFeltSafe, setRouteFeltSafe] = useState<RouteFeltSafe>('Yes');

  // Section 4: Destination experience
  const [destinationRating, setDestinationRating] = useState<number>(5);
  const [hoveredDestStar, setHoveredDestStar] = useState<number | null>(null);
  const [destinationExperiences, setDestinationExperiences] = useState<string[]>(['Safe environment', 'No major issues']);

  // Section 5: Incident / Problem reporting
  const [safetyIssueType, setSafetyIssueType] = useState<SafetyIssueType>('No issues');
  const [safetyIssueDetails, setSafetyIssueDetails] = useState<string>('');

  // Section 6: AI / Safe Road Experience ratings
  const [featureRatings, setFeatureRatings] = useState<Record<string, number | null>>({
    aiSafetyGuide: 5,
    safeRouteRecommendation: 5,
    smartSafeBubble: 5,
    safetyAlerts: 5,
    sosEmergencySupport: 5,
    offlineSafetyFeatures: null // Default 'Not Used'
  });

  // Section 7: Open Feedback
  const [suggestions, setSuggestions] = useState<string>('');

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingExisting, setIsFetchingExisting] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [submittedReview, setSubmittedReview] = useState<TripReview | null>(null);

  // Fetch existing review if user already submitted one
  useEffect(() => {
    if (!isOpen || !trip?.id) return;
    let isMounted = true;
    setIsFetchingExisting(true);
    setErrorMessage(null);
    setIsSuccess(false);

    fetch(`/api/v1/trips/${trip.id}/reviews/me`, {
      headers: {
        Authorization: `Bearer ${currentUser.firebaseUid}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.review) {
          const rev: TripReview = data.review;
          setSubmittedReview(rev);
          setOverallRating(rev.overallRating);
          setSafetyRating(rev.safetyRating);
          setRouteRating(rev.routeRating);
          setRouteFeltSafe(rev.routeFeltSafe);
          setDestinationRating(rev.destinationRating || 5);
          setDestinationExperiences(rev.destinationExperiences || []);
          setSafetyIssueType(rev.safetyIssueType);
          setSafetyIssueDetails(rev.safetyIssueDetails || '');
          if (rev.featureRatings) {
            setFeatureRatings(rev.featureRatings);
          }
          setSuggestions(rev.suggestions || '');
        }
      })
      .catch(err => {
        console.warn('Could not load existing review:', err);
      })
      .finally(() => {
        if (isMounted) setIsFetchingExisting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, trip?.id, currentUser.firebaseUid]);

  if (!isOpen) return null;

  const toggleExperienceTag = (tag: string) => {
    setDestinationExperiences(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleFeatureRatingChange = (key: string, rating: number | null) => {
    setFeatureRatings(prev => ({
      ...prev,
      [key]: rating
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (trip.status !== 'COMPLETED') {
      setErrorMessage('Reviews can only be submitted for completed trips.');
      return;
    }

    if (safetyIssueType !== 'No issues' && !safetyIssueDetails.trim()) {
      setErrorMessage('Please describe the safety-related issue that occurred.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/trips/${trip.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.firebaseUid}`
        },
        body: JSON.stringify({
          overallRating,
          safetyRating,
          routeRating,
          routeFeltSafe,
          destinationRating,
          destinationExperiences,
          safetyIssueType,
          safetyIssueDetails: safetyIssueType !== 'No issues' ? safetyIssueDetails.trim() : undefined,
          featureRatings,
          suggestions: suggestions.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit review');
      }

      setSubmittedReview(data.review);
      setIsSuccess(true);
      if (onSubmitted) {
        onSubmitted(data.review);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting your review.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0F1218] border border-[#2D3139] rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col font-mono text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2D3139] bg-[#141720] sticky top-0 z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/80 text-[#4ADE80] border border-emerald-800">
                TRIP COMPLETED 🎉
              </span>
              <span className="text-xs text-slate-400 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-red-400" />
                <span className="font-bold text-white">{trip.destination}</span>
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">Trip Review</h2>
            <p className="text-xs text-slate-400">Help us understand your travel experience.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#1A1D24] text-slate-400 hover:text-white hover:bg-[#252932] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-7 flex-1">
          {isFetchingExisting ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-[#4ADE80] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading trip experience details...</p>
            </div>
          ) : isSuccess ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-950/70 border border-emerald-600 flex items-center justify-center mx-auto text-[#4ADE80]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Trip Review Submitted!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Thank you, <span className="text-white font-bold">{currentUser.name}</span>. Your feedback helps refine SafeRoad+'s destination safety intelligence and assists fellow travelers on future expeditions.
                </p>
              </div>

              <div className="p-4 bg-[#141720] border border-[#2D3139] rounded-xl max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#2D3139] pb-2">
                  <span className="text-slate-400">Overall Rating:</span>
                  <span className="font-bold text-amber-400 flex items-center space-x-1">
                    <span>{'★'.repeat(submittedReview?.overallRating || overallRating)}</span>
                    <span className="text-slate-300">({OVERALL_RATING_LABELS[submittedReview?.overallRating || overallRating]})</span>
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#2D3139] pb-2">
                  <span className="text-slate-400">Safety Feeling:</span>
                  <span className={`font-bold ${SAFETY_RATING_LABELS[submittedReview?.safetyRating || safetyRating].color}`}>
                    {SAFETY_RATING_LABELS[submittedReview?.safetyRating || safetyRating].text}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#2D3139] pb-2">
                  <span className="text-slate-400">Route Rating:</span>
                  <span className="font-bold text-white">{submittedReview?.routeRating || routeRating}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reported Issues:</span>
                  <span className={`font-bold ${(submittedReview?.safetyIssueType || safetyIssueType) === 'No issues' ? 'text-[#4ADE80]' : 'text-amber-400'}`}>
                    {submittedReview?.safetyIssueType || safetyIssueType}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#4ADE80] hover:bg-emerald-400 text-black font-bold text-xs rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              {errorMessage && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* SECTION 1 — OVERALL EXPERIENCE */}
              <div className="p-4 bg-[#141720] border border-[#2D3139] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    1. Overall Trip Experience <span className="text-red-400">*</span>
                  </label>
                  <span className="text-xs font-bold text-amber-400">
                    {OVERALL_RATING_LABELS[hoveredOverallStar || overallRating]}
                  </span>
                </div>
                <p className="text-xs text-slate-400">How was your overall trip experience?</p>
                <div className="flex items-center space-x-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoveredOverallStar || overallRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setOverallRating(star as OverallRating)}
                        onMouseEnter={() => setHoveredOverallStar(star)}
                        onMouseLeave={() => setHoveredOverallStar(null)}
                        className="p-1.5 focus:outline-none transition-transform hover:scale-125"
                        aria-label={`Rate ${star} star`}
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : 'text-slate-600 hover:text-slate-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2 — SAFETY EXPERIENCE */}
              <div className="p-4 bg-[#141720] border border-[#2D3139] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#4ADE80]" />
                    <span>2. Safety Experience</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <span className={`text-xs font-bold ${SAFETY_RATING_LABELS[safetyRating].color}`}>
                    {SAFETY_RATING_LABELS[safetyRating].text} ({safetyRating}/5)
                  </span>
                </div>
                <p className="text-xs text-slate-400">How safe did you feel during the trip?</p>

                {/* 5-point visual selector control: Very Unsafe -> Very Safe */}
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isSelected = safetyRating === level;
                    const config = SAFETY_RATING_LABELS[level];
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSafetyRating(level as SafetyRating)}
                        className={`py-2.5 px-1 rounded-lg border text-center transition-all ${
                          isSelected
                            ? `${config.bg} ${config.color} font-bold ring-2 ring-emerald-500/50 scale-[1.02]`
                            : 'bg-[#0A0B0E] border-[#2D3139] text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-sm font-bold">{level}</div>
                        <div className="text-[10px] truncate">{config.text}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 px-1">
                  <span>Very Unsafe</span>
                  <span>Neutral</span>
                  <span>Very Safe</span>
                </div>
              </div>

              {/* SECTION 3 — ROUTE EXPERIENCE */}
              <div className="p-4 bg-[#141720] border border-[#2D3139] rounded-xl space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Route className="w-4 h-4 text-sky-400" />
                    <span>3. Route Experience</span>
                  </label>
                  <p className="text-xs text-slate-400">How was the recommended route?</p>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {(['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'] as RouteRating[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRouteRating(r)}
                      className={`py-2 px-1 text-xs rounded-lg border transition-all text-center ${
                        routeRating === r
                          ? 'bg-sky-950/70 border-sky-500 text-sky-300 font-bold'
                          : 'bg-[#0A0B0E] border-[#2D3139] text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#2D3139] space-y-2">
                  <p className="text-xs text-slate-300 font-medium">Did the recommended route feel safe?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Yes', 'Partially', 'No', 'Not Applicable'] as RouteFeltSafe[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setRouteFeltSafe(option)}
                        className={`py-2 px-2 text-xs rounded-lg border transition-all text-center ${
                          routeFeltSafe === option
                            ? 'bg-[#1C2028] border-[#4ADE80] text-[#4ADE80] font-bold'
                            : 'bg-[#0A0B0E] border-[#2D3139] text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 4 — DESTINATION EXPERIENCE */}
              <div className="p-4 bg-[#141720] border border-[#2D3139] rounded-xl space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>4. Destination Experience</span>
                    </label>
                    <span className="text-xs font-bold text-amber-400">
                      {destinationRating} / 5 Stars
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">How was your experience at {trip.destination}?</p>
                </div>

                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoveredDestStar || destinationRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setDestinationRating(star)}
                        onMouseEnter={() => setHoveredDestStar(star)}
                        onMouseLeave={() => setHoveredDestStar(null)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600 hover:text-slate-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#2D3139] space-y-2">
                  <p className="text-xs text-slate-300 font-medium">What did you experience? (Select all that apply):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DESTINATION_EXPERIENCE_OPTIONS.map((tag) => {
                      const isChecked = destinationExperiences.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleExperienceTag(tag)}
                          className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center space-x-2 ${
                            isChecked
                              ? 'bg-emerald-950/60 border-emerald-600 text-white font-bold'
                              : 'bg-[#0A0B0E] border-[#2D3139] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                              isChecked ? 'bg-[#4ADE80] border-[#4ADE80] text-black font-bold' : 'border-slate-600'
                            }`}
                          >
                            {isChecked && '✓'}
                          </div>
                          <span className="truncate">{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 5 — INCIDENT / PROBLEM REPORTING */}
              <div className="p-4 bg-[#141720] border border-[#2D3139] rounded-xl space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>5. Incident / Problem Reporting</span>
                  </label>
                  <p className="text-xs text-slate-400">Did you face any safety-related issue during this trip?</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['No issues', 'Minor issue', 'Safety concern', 'Emergency situation'] as SafetyIssueType[]).map((issue) => {
                    const isSelected = safetyIssueType === issue;
                    const isEmergency = issue === 'Emergency situation';
                    return (
                      <button
                        key={issue}
                        type="button"
                        onClick={() => setSafetyIssueType(issue)}
                        className={`p-2.5 rounded-lg border text-xs text-center transition-all flex items-center justify-center space-x-1.5 ${
                          isSelected
                            ? isEmergency
                              ? 'bg-red-950/80 border-red-600 text-red-300 font-bold'
                              : 'bg-amber-950/70 border-amber-600 text-amber-300 font-bold'
                            : 'bg-[#0A0B0E] border-[#2D3139] text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? (isEmergency ? 'bg-red-500' : 'bg-amber-400') : 'bg-slate-600'}`} />
                        <span>{issue}</span>
                      </button>
                    );
                  })}
                </div>

                {safetyIssueType !== 'No issues' && (
                  <div className="space-y-2 pt-2 animate-fadeIn">
                    <label className="text-xs font-bold text-white block">
                      What happened? <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={safetyIssueDetails}
                      onChange={(e) => setSafetyIssueDetails(e.target.value)}
                      rows={3}
                      placeholder="Describe what happened, where it happened, and any important details..."
                      className="w-full p-3 bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono resize-none"
                    />
                    <p className="text-[10px] text-slate-500">
                      ℹ️ For safety analytics only. Do not include sensitive financial or private identity information.
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 6 — AI / SAFE ROAD EXPERIENCE */}
              <div className="p-4 bg-[#141720] border border-[#2D3139] rounded-xl space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-[#4ADE80]" />
                    <span>6. AI / SafeRoad+ Feature Experience</span>
                  </label>
                  <p className="text-xs text-slate-400">How helpful were SafeRoad+'s safety features during your trip?</p>
                </div>

                <div className="space-y-3">
                  {SAFETY_FEATURES_LIST.map(({ key, label, icon: IconComponent }) => {
                    const currentRating = featureRatings[key];
                    const isNotUsed = currentRating === null;
                    return (
                      <div
                        key={key}
                        className="p-3 bg-[#0A0B0E] border border-[#2D3139] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center space-x-2">
                          <IconComponent className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-xs font-bold text-white">{label}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Stars 1-5 */}
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isFilled = !isNotUsed && (currentRating !== null && star <= currentRating);
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => handleFeatureRatingChange(key, star)}
                                  className="p-0.5 focus:outline-none hover:scale-110 transition-transform"
                                  aria-label={`${label} ${star} stars`}
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      isFilled
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-600 hover:text-slate-400'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>

                          {/* Not Used toggle */}
                          <button
                            type="button"
                            onClick={() => handleFeatureRatingChange(key, isNotUsed ? 5 : null)}
                            className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                              isNotUsed
                                ? 'bg-slate-800 border-slate-600 text-slate-200 font-bold'
                                : 'bg-transparent border-[#2D3139] text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Not Used
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 7 — OPEN FEEDBACK */}
              <div className="p-4 bg-[#141720] border border-[#2D3139] rounded-xl space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    7. Open Feedback & Suggestions
                  </label>
                  <p className="text-xs text-slate-400">Suggestions for improvement or any thoughts for SafeRoad+?</p>
                </div>
                <textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  rows={3}
                  placeholder="Share any suggestions on routes, safety advisories, or trip leadership features..."
                  className="w-full p-3 bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4ADE80] font-mono resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 sticky bottom-0 bg-[#0F1218] p-2 border-t border-[#2D3139]">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-300 text-xs font-bold transition-colors"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#4ADE80] hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{submittedReview ? 'Update Trip Review' : 'Submit Review'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
