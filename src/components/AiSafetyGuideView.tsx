import React, { useState } from 'react';
import { Trip, UserProfile, AIDestinationSafetyGuide, SafeRouteOption } from '../types';
import { ShieldCheck, Route, AlertCircle, FileText, CheckCircle2, Navigation, Award, Sparkles, Globe } from 'lucide-react';

interface AiSafetyGuideViewProps {
  activeTrip: Trip | null;
  currentUser: UserProfile;
  onGenerateGuide: (destination: string, language: string) => Promise<AIDestinationSafetyGuide>;
  onEvaluateRoutes: (origin: string, destination: string, mode: string) => Promise<SafeRouteOption[]>;
  onSelectApprovedRoute: (route: SafeRouteOption) => Promise<void>;
}

export const AiSafetyGuideView: React.FC<AiSafetyGuideViewProps> = ({
  activeTrip,
  currentUser,
  onGenerateGuide,
  onEvaluateRoutes,
  onSelectApprovedRoute
}) => {
  const [destinationInput, setDestinationInput] = useState(activeTrip?.destination || '');
  const [language, setLanguage] = useState(currentUser.preferredLanguage || 'en');
  const [guide, setGuide] = useState<AIDestinationSafetyGuide | null>(null);
  const [routes, setRoutes] = useState<SafeRouteOption[]>([]);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  const isLeader = activeTrip && activeTrip.leaderId === currentUser.id;

  const handleFetchGuide = async () => {
    setIsLoadingGuide(true);
    try {
      const result = await onGenerateGuide(destinationInput, language);
      setGuide(result);
    } catch (err: any) {
      alert(err.message || 'Failed to generate safety guide');
    } finally {
      setIsLoadingGuide(false);
    }
  };

  const handleFetchRoutes = async () => {
    setIsLoadingRoutes(true);
    try {
      const evaluated = await onEvaluateRoutes('Chandigarh', destinationInput, activeTrip?.transportMode || 'Car');
      setRoutes(evaluated);
    } catch (err: any) {
      alert(err.message || 'Failed to evaluate routes');
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-mono">
      {/* Search Header Banner */}
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#4ADE80] tracking-widest flex items-center space-x-1.5 font-mono">
              <Sparkles className="w-4 h-4 text-[#4ADE80]" />
              <span>AI Intelligence Guidance</span>
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white font-sans mt-0.5">Destination Safety & Route Evaluation</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Powered by real-time safety advisories and road telemetry.
            </p>
          </div>

          {/* Destination & Language Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              placeholder="Enter destination..."
              className="bg-[#11141A] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80] w-48"
            />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#11141A] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
            >
              <option value="en">English (EN)</option>
              <option value="hi">Hindi (HI)</option>
              <option value="es">Spanish (ES)</option>
            </select>

            <button
              onClick={handleFetchGuide}
              disabled={isLoadingGuide}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoadingGuide ? 'Analyzing...' : 'Generate Safety Guide'}
            </button>
          </div>
        </div>
      </div>

      {/* Safety Guide Results */}
      {guide ? (
        <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#2D3139] pb-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 font-mono">Target Destination</span>
              <h3 className="text-base font-bold text-white font-sans mt-0.5">{guide.destinationName}</h3>
            </div>

            <span className={`px-3 py-1 text-xs font-bold rounded border uppercase font-mono ${
              guide.overallSafetyRating === 'HIGH'
                ? 'bg-emerald-950/60 text-[#4ADE80] border-emerald-800'
                : 'bg-amber-950/60 text-amber-400 border-amber-800'
            }`}>
              Safety Rating: {guide.overallSafetyRating}
            </span>
          </div>

          <div className="p-4 bg-[#11141A] border border-[#2D3139] rounded-lg">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">{guide.safetySummary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Verified Advisories */}
            <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 sm:p-5 space-y-2.5">
              <span className="font-bold text-[#4ADE80] block uppercase tracking-wider text-[10px] font-mono">
                Verified Travel Advisories
              </span>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                {guide.verifiedAdvisories.map((adv, i) => (
                  <li key={i}>{adv}</li>
                ))}
              </ul>
            </div>

            {/* Crime Precautions */}
            <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 sm:p-5 space-y-2.5">
              <span className="font-bold text-[#4ADE80] block uppercase tracking-wider text-[10px] font-mono">
                Recommended Precautions
              </span>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                {guide.crimePrecautions.map((cp, i) => (
                  <li key={i}>{cp}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-10 text-center space-y-2 shadow-2xl">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#4ADE80] block font-mono">AI Safety Intelligence</span>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">Enter an expedition destination above and generate a safety guide to view verified alerts and travel recommendations.</p>
        </div>
      )}

      {/* Safe Route Evaluator */}
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D3139] pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2 font-sans">
              <Route className="w-5 h-5 text-[#4ADE80]" />
              <span>Safe Route Evaluator</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Assesses road lighting, terrain stability, and emergency proximity.</p>
          </div>

          <button
            onClick={handleFetchRoutes}
            disabled={isLoadingRoutes}
            className="bg-[#1A1D24] hover:bg-[#252932] text-[#4ADE80] border border-[#2D3139] font-bold text-xs px-4 py-2.5 rounded-lg transition-colors self-start sm:self-center"
          >
            {isLoadingRoutes ? 'Evaluating Routes...' : 'Evaluate Route Options'}
          </button>
        </div>

        {/* Selected Approved Route Banner */}
        {activeTrip?.selectedRoute && (
          <div className="bg-emerald-950/40 border border-emerald-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#4ADE80] tracking-wider block font-mono">Locked Expedition Route</span>
              <h4 className="text-sm font-bold text-white font-sans">{activeTrip.selectedRoute.routeName}</h4>
              <p className="text-slate-300 text-xs mt-0.5 font-mono">{activeTrip.selectedRoute.distanceKm} km • {activeTrip.selectedRoute.estimatedTimeMins} mins estimated</p>
            </div>
            <span className="bg-emerald-600 text-white font-bold text-[10px] uppercase px-3 py-1 rounded self-start sm:self-center font-mono">
              Approved by Leader
            </span>
          </div>
        )}

        {/* Evaluated Route Options */}
        {routes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map(r => (
              <div
                key={r.id}
                className={`p-5 rounded-xl border space-y-3 transition-all ${
                  r.isRecommendedByAI
                    ? 'bg-[#11141A] border-[#4ADE80]/80 shadow-lg'
                    : 'bg-[#11141A] border-[#2D3139]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    {r.isRecommendedByAI && (
                      <span className="text-[10px] font-bold uppercase bg-emerald-950/80 text-[#4ADE80] border border-emerald-800 px-2 py-0.5 rounded mb-1.5 inline-block font-mono">
                        AI Recommended
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-white font-sans">{r.routeName}</h4>
                    <span className="text-xs text-slate-400 font-mono">{r.distanceKm} km • Est. {r.estimatedTimeMins} mins</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-bold font-mono text-[#4ADE80]">{r.safetyScore}</span>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold font-mono">Safety Score</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">Key Highlights:</span>
                  <ul className="text-slate-300 list-disc list-inside space-y-1 text-xs font-sans">
                    {r.safetyHighlights.map((sh, idx) => (
                      <li key={idx}>{sh}</li>
                    ))}
                  </ul>
                </div>

                {isLeader && (
                  <button
                    onClick={() => onSelectApprovedRoute(r)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors"
                  >
                    Lock as Expedition Route
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
