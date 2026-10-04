import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';
import { Shield, Lock, AlertCircle, Compass, Loader2, MapPin, Radio, HeartPulse, CheckCircle2 } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user) {
        onLoginSuccess({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'SafeRoad Traveler',
          photoURL: user.photoURL || undefined
        });
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      let friendlyError = 'Authentication failed. Please try again.';

      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        friendlyError = 'Sign-in window was closed before completing authentication.';
      } else if (error.code === 'auth/network-request-failed') {
        friendlyError = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/unauthorized-domain') {
        friendlyError = 'This domain is not authorized in Firebase Console. Please add it to Authorized Domains under Firebase Auth Settings.';
      } else if (error.message) {
        friendlyError = error.message;
      }

      setErrorMessage(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick sign-in helper for development/testing demo
  const handleQuickDemoLogin = (role: 'leader' | 'member') => {
    if (role === 'leader') {
      onLoginSuccess({
        uid: 'usr_leader_001',
        email: 'alex.rivera@saferoad.org',
        displayName: 'Alex Rivera (Expedition Leader)'
      });
    } else {
      onLoginSuccess({
        uid: 'usr_member_002',
        email: 'priya.sharma@saferoad.org',
        displayName: 'Priya Sharma (Traveler)'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-slate-100 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0F1218] border border-[#2D3139] rounded-2xl p-8 space-y-6 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#1A1D24] border border-[#2D3139] text-[#4ADE80] shadow-lg">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-2xl font-bold font-mono tracking-wider text-white">SafeRoad<span className="text-[#4ADE80]">+</span></h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-[#4ADE80] border border-emerald-800/60">
                PRO SAFETY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              AI-Powered Tourist Safety Grid & Smart Emergency Response
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
          <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-2.5 text-center space-y-1">
            <MapPin className="w-4 h-4 text-[#4ADE80] mx-auto" />
            <p className="text-[11px] font-bold text-white">100m Bubble</p>
            <p className="text-[9px] text-slate-400">Dynamic Geofence</p>
          </div>
          <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-2.5 text-center space-y-1">
            <HeartPulse className="w-4 h-4 text-red-500 mx-auto" />
            <p className="text-[11px] font-bold text-white">10s SOS Alert</p>
            <p className="text-[9px] text-slate-400">Emergency Dispatch</p>
          </div>
          <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-2.5 text-center space-y-1">
            <Radio className="w-4 h-4 text-blue-400 mx-auto" />
            <p className="text-[11px] font-bold text-white">Mesh Sync</p>
            <p className="text-[9px] text-slate-400">Offline Resilience</p>
          </div>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-red-200 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Sign-In Notice</span>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Primary Auth Action Button */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-[#1A1D24] hover:bg-[#252932] text-white font-mono font-semibold rounded-lg px-4 py-3 text-xs flex items-center justify-center space-x-3 border border-[#2D3139] hover:border-[#4ADE80] transition-all disabled:opacity-50"
            id="google-signin-btn"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 text-[#4ADE80] animate-spin" />
                <span>Authenticating with Google...</span>
              </>
            ) : (
              <>
                {/* Official Google Icon SVG */}
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center p-0.5 shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Instant Demo Role Switcher */}
          <div className="pt-2">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#2D3139]"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Quick Demo Access</span>
              <div className="flex-grow border-t border-[#2D3139]"></div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 font-mono">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('leader')}
                className="p-2.5 bg-[#11141A] hover:bg-[#1A1D24] border border-[#2D3139] hover:border-[#4ADE80] rounded-lg text-left transition-colors"
              >
                <p className="text-xs font-semibold text-white">Alex Rivera</p>
                <p className="text-[10px] text-[#4ADE80]">Trip Leader</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('member')}
                className="p-2.5 bg-[#11141A] hover:bg-[#1A1D24] border border-[#2D3139] hover:border-[#4ADE80] rounded-lg text-left transition-colors"
              >
                <p className="text-xs font-semibold text-white">Priya Sharma</p>
                <p className="text-[10px] text-slate-400">Group Member</p>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="pt-4 border-t border-[#2D3139] text-center text-xs font-mono text-slate-500 flex items-center justify-center space-x-1.5">
          <Lock className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
          <span>Secured with Firebase Authentication & Google OAuth 2.0</span>
        </div>
      </div>
    </div>
  );
};
