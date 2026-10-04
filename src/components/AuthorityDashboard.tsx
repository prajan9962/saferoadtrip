import React, { useState, useEffect } from 'react';
import { SOSRecord, UserProfile } from '../types';
import { AlertTriangle, MapPin, HeartPulse, ExternalLink, ShieldAlert, Phone, Navigation, RefreshCw } from 'lucide-react';

interface AuthorityDashboardProps {
  currentUser?: UserProfile;
}

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ currentUser }) => {
  const [alerts, setAlerts] = useState<SOSRecord[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SOSRecord | null>(null);
  const [medicalInfo, setMedicalInfo] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDashboardAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/sos/authority-dashboard');
      const data = await res.json();
      if (data.activeEmergencyAlerts) {
        setAlerts(data.activeEmergencyAlerts);
        if (data.activeEmergencyAlerts.length > 0 && !selectedAlert) {
          handleSelectAlert(data.activeEmergencyAlerts[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardAlerts();
    const interval = setInterval(fetchDashboardAlerts, 5000); // Live polling every 5s
    return () => clearInterval(interval);
  }, []);

  const handleSelectAlert = async (alert: SOSRecord) => {
    setSelectedAlert(alert);
    try {
      const token = currentUser?.firebaseUid || 'authority_secure_token';
      const res = await fetch(`/api/v1/sos/${alert.id}/medical-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMedicalInfo(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-mono">
      {/* Dashboard Header */}
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-lg bg-red-950/60 border border-red-800 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-red-400 tracking-widest block font-mono">Official Emergency Services Feed</span>
            <h2 className="text-base sm:text-lg font-bold text-white font-sans mt-0.5">Emergency Incident Dispatch Console</h2>
          </div>
        </div>

        <button
          onClick={fetchDashboardAlerts}
          className="bg-[#1A1D24] hover:bg-[#252932] text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg border border-[#2D3139] transition-colors flex items-center space-x-1.5 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#4ADE80] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Live Feed</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Emergency SOS Alerts List */}
        <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#2D3139] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Active Incidents</span>
            </h3>
            <span className="text-[10px] text-red-300 font-bold bg-red-950/60 px-2.5 py-0.5 rounded border border-red-800">
              {alerts.length} Active
            </span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {alerts.length > 0 ? (
              alerts.map(a => (
                <div
                  key={a.id}
                  onClick={() => handleSelectAlert(a)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedAlert?.id === a.id
                      ? 'bg-red-950/40 border-red-700 shadow-md'
                      : 'bg-[#11141A] border-[#2D3139] hover:bg-[#161922]'
                  }`}
                >
                  <div className="flex justify-between items-start font-bold text-xs">
                    <span className="text-white">{a.userName}</span>
                    <span className="text-red-300 text-[10px] uppercase bg-red-950 px-2 py-0.5 rounded border border-red-800 font-bold">
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Phone: {a.userPhone}</p>
                  <span className="text-xs text-[#4ADE80] font-mono block mt-1">
                    Fix: {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-slate-500">
                No active emergency distress incidents.
              </div>
            )}
          </div>
        </div>

        {/* Selected Emergency SOS Dispatch Detail View */}
        <div className="lg:col-span-2 bg-[#0F1218] border border-[#2D3139] rounded-xl p-5 sm:p-6 shadow-2xl space-y-5">
          {selectedAlert && medicalInfo ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D3139] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider block font-mono">Authorized Incident Telemetry</span>
                  <h3 className="text-base font-bold text-white font-sans mt-0.5">{medicalInfo.user.name} ({medicalInfo.user.age} y/o, {medicalInfo.user.gender})</h3>
                </div>

                <a
                  href={medicalInfo.routeToVictim}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors self-start sm:self-center"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate Route to Victim</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Patient Medical Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-2">
                  <span className="text-xs font-bold text-[#4ADE80] uppercase tracking-wider block flex items-center space-x-1.5 font-mono">
                    <HeartPulse className="w-4 h-4 text-red-500" />
                    <span>Medical Profile</span>
                  </span>
                  <div className="space-y-1.5 text-slate-300 text-xs font-mono">
                    <div><span className="text-slate-500">Blood Group:</span> <strong className="text-white font-bold ml-1">{medicalInfo.medicalInfo.bloodGroup}</strong></div>
                    <div><span className="text-slate-500">Conditions:</span> <span className="ml-1 text-slate-300">{medicalInfo.medicalInfo.medicalConditions}</span></div>
                    <div><span className="text-slate-500">Allergies:</span> <span className="ml-1 text-slate-300">{medicalInfo.medicalInfo.allergies}</span></div>
                  </div>
                </div>

                <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 space-y-2">
                  <span className="text-xs font-bold text-[#4ADE80] uppercase tracking-wider block flex items-center space-x-1.5 font-mono">
                    <Phone className="w-4 h-4 text-[#4ADE80]" />
                    <span>Emergency Contacts</span>
                  </span>
                  <div className="space-y-1.5 text-slate-300 text-xs font-mono">
                    <div><span className="text-slate-500">Contact:</span> <strong className="text-white font-bold ml-1">{medicalInfo.medicalInfo.emergencyContactName}</strong></div>
                    <div><span className="text-slate-500">Contact Phone:</span> <span className="ml-1 text-slate-300">{medicalInfo.medicalInfo.emergencyContactPhone}</span></div>
                    <div><span className="text-slate-500">Victim Phone:</span> <span className="ml-1 text-slate-300">{medicalInfo.user.phone}</span></div>
                  </div>
                </div>
              </div>

              {/* Exact Coordinates */}
              <div className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block font-mono">Incident GPS Coordinates</span>
                  <span className="text-white font-mono font-bold text-xs sm:text-sm">
                    Lat: {medicalInfo.location.latitude.toFixed(6)}, Lng: {medicalInfo.location.longitude.toFixed(6)}
                  </span>
                </div>
                <span className="bg-emerald-950/60 text-[#4ADE80] border border-emerald-800 text-[10px] font-bold uppercase px-3 py-1 rounded self-start sm:self-center font-mono">
                  Live GPS Fix Active
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Select an active emergency alert to view detailed rescue and medical telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
