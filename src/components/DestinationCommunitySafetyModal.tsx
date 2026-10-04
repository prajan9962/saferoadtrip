import React, { useState, useEffect } from 'react';
import { DestinationReviewSummary } from '../types';
import { ShieldCheck, Star, Users, MapPin, X, AlertTriangle, Route } from 'lucide-react';

interface DestinationCommunitySafetyModalProps {
  destination: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DestinationCommunitySafetyModal: React.FC<DestinationCommunitySafetyModalProps> = ({
  destination,
  isOpen,
  onClose
}) => {
  const [summary, setSummary] = useState<DestinationReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !destination) return;
    setIsLoading(true);

    fetch(`/api/v1/destinations/${encodeURIComponent(destination)}/reviews/summary`)
      .then(res => res.json())
      .then(data => {
        setSummary(data.summary || null);
      })
      .catch(err => {
        console.warn('Could not load destination community review summary:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, destination]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-xl bg-[#0F1218] border border-[#2D3139] rounded-2xl shadow-2xl overflow-hidden font-mono text-slate-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#2D3139] bg-[#141720] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-[#4ADE80] uppercase tracking-wider bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              COMMUNITY SAFETY INTELLIGENCE
            </span>
            <h3 className="text-base font-bold text-white flex items-center space-x-1.5 pt-1">
              <MapPin className="w-4 h-4 text-red-400" />
              <span>{destination}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Aggregated traveler experience & verified community feedback
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#1A1D24] text-slate-400 hover:text-white hover:bg-[#252932] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-7 h-7 border-2 border-[#4ADE80] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Aggregating traveler safety reports...</p>
            </div>
          ) : !summary || summary.totalReviews === 0 ? (
            <div className="p-8 text-center bg-[#141720] border border-[#2D3139] rounded-xl space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Traveler Reviews Yet for {destination}</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Be the first to complete a trip to {destination} and submit your review! SafeRoad+ uses official government and police advisories as primary safety data.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Critical Rule Notice */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-[11px] text-emerald-300 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#4ADE80] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>SafeRoad+ Safety Principle:</strong> Verified traveler reviews complement official government advisories, accident analytics, and road patrol reports without overriding verified authoritative safety data.
                </span>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#141720] border border-[#2D3139] rounded-xl text-center">
                  <div className="text-xl font-bold text-white">{summary.totalReviews}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Verified Reviews</div>
                </div>
                <div className="p-3 bg-[#141720] border border-[#2D3139] rounded-xl text-center">
                  <div className="text-xl font-bold text-amber-400 flex items-center justify-center space-x-1">
                    <span>{summary.averageOverallRating}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase">Overall Experience</div>
                </div>
                <div className="p-3 bg-[#141720] border border-[#2D3139] rounded-xl text-center">
                  <div className="text-xl font-bold text-[#4ADE80]">{summary.averageSafetyRating}/5</div>
                  <div className="text-[10px] text-slate-400 uppercase">Safety Feeling</div>
                </div>
                <div className="p-3 bg-[#141720] border border-[#2D3139] rounded-xl text-center">
                  <div className="text-xl font-bold text-sky-400">{summary.routeSafetyPercentage}%</div>
                  <div className="text-[10px] text-slate-400 uppercase">Route Safety</div>
                </div>
              </div>

              {/* Observed Conditions */}
              {summary.topExperiences.length > 0 && (
                <div className="p-4 bg-[#141720] border border-[#2D3139] rounded-xl space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Traveler-Observed Conditions
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {summary.topExperiences.map(e => (
                      <span
                        key={e.tag}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[#0A0B0E] border border-[#2D3139] text-slate-300 flex items-center space-x-1.5"
                      >
                        <span>{e.tag}</span>
                        <span className="text-[10px] text-[#4ADE80] font-bold">({e.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Issues Alert */}
              <div className="p-4 bg-[#141720] border border-[#2D3139] rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`w-5 h-5 ${summary.safetyIssueCount > 0 ? 'text-amber-400' : 'text-[#4ADE80]'}`} />
                  <div>
                    <div className="text-xs font-bold text-white">
                      {summary.safetyIssueCount === 0 ? 'No Safety Incidents Reported' : `${summary.safetyIssueCount} Safety Concern(s) Reported`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Based on {summary.totalReviews} verified trip feedback reports
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                  summary.safetyIssueCount === 0 ? 'bg-emerald-950 text-[#4ADE80] border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {summary.safetyIssueCount === 0 ? 'CLEAN RECORD' : 'ADVISORY'}
                </span>
              </div>

              {/* Recent Traveler Feedback */}
              {summary.recentReviews.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Recent Traveler Feedback
                  </span>
                  <div className="space-y-2">
                    {summary.recentReviews.map(r => (
                      <div key={r.id} className="p-3 bg-[#0A0B0E] border border-[#2D3139] rounded-lg space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{r.userName}</span>
                          <span className="text-amber-400">{'★'.repeat(r.overallRating)}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                          <span>Safety: <strong className="text-white">{r.safetyRating}/5</strong></span>
                          <span>Route: <strong className="text-white">{r.routeRating}</strong></span>
                          <span>Issues: <strong className={r.safetyIssueType === 'No issues' ? 'text-[#4ADE80]' : 'text-amber-400'}>{r.safetyIssueType}</strong></span>
                        </div>
                        {r.suggestions && (
                          <p className="text-[11px] text-slate-300 italic pt-1 border-t border-[#1C2028]">
                            "{r.suggestions}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2D3139] bg-[#141720] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-xs font-bold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
