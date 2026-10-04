import React from 'react';
import { Trip } from '../types';
import { Sparkles, MapPin, Star, ArrowRight } from 'lucide-react';

interface TripReviewPromptModalProps {
  trip: Trip;
  isOpen: boolean;
  onReviewTrip: () => void;
  onSkipForNow: () => void;
}

export const TripReviewPromptModal: React.FC<TripReviewPromptModalProps> = ({
  trip,
  isOpen,
  onReviewTrip,
  onSkipForNow
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0F1218] border border-emerald-500/50 rounded-2xl shadow-[0_0_50px_rgba(74,222,128,0.15)] overflow-hidden font-mono text-slate-200 p-6 space-y-5">
        
        {/* Decorative Top Accent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🎉</span>
            <span className="text-xs font-bold text-[#4ADE80] uppercase tracking-wider bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
              Trip Completed!
            </span>
          </div>
          <span className="text-[10px] text-slate-500">SafeRoad+ Expedition</span>
        </div>

        {/* Title & Destination */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
            <span>How was your experience with this trip?</span>
          </h3>
          <p className="text-xs text-slate-400">
            Destination: <span className="text-white font-bold">{trip.destination}</span>
          </p>
        </div>

        {/* Informative Value Card */}
        <div className="p-3.5 bg-[#141720] border border-[#2D3139] rounded-xl space-y-2 text-xs text-slate-300">
          <div className="flex items-center space-x-2 text-amber-400">
            <Star className="w-4 h-4 fill-amber-400" />
            <span className="font-bold">Your feedback makes travel safer</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Rate your overall trip, route safety, and destination conditions. Your feedback helps fellow travelers and enhances SafeRoad+'s community safety intelligence.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onSkipForNow}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-[#1A1D24] hover:bg-[#252932] border border-[#2D3139] text-slate-300 text-xs font-bold transition-colors text-center"
          >
            Skip for Now
          </button>
          <button
            type="button"
            onClick={onReviewTrip}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-[#4ADE80] hover:bg-emerald-400 text-black text-xs font-bold transition-colors flex items-center justify-center space-x-2"
          >
            <span>Review Trip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[10px] text-slate-500 text-center">
          You can also complete or update your review anytime from your Completed Trips list.
        </p>
      </div>
    </div>
  );
};
