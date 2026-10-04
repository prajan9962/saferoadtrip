import React, { useState } from 'react';
import { Trip, UserProfile, OfflineMessage } from '../types';
import { Radio, WifiOff, RefreshCw, Send, ShieldAlert, CheckCircle2, Wifi } from 'lucide-react';

interface OfflineBleSimulatorProps {
  activeTrip: Trip | null;
  currentUser: UserProfile;
}

export const OfflineBleSimulator: React.FC<OfflineBleSimulatorProps> = ({
  activeTrip,
  currentUser
}) => {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [messages, setMessages] = useState<OfflineMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');

  const handleSendMessage = () => {
    if (!inputMsg.trim()) return;
    const newMsg: OfflineMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      type: 'LEADERSHIP_MSG',
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: inputMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      synced: !isOfflineMode
    };

    setMessages([...messages, newMsg]);
    setInputMsg('');
  };

  const handleSyncOfflineQueue = () => {
    setMessages(messages.map(m => ({ ...m, synced: true })));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-mono">
      {/* Offline Mode Switcher Banner */}
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase text-[#4ADE80] tracking-widest flex items-center space-x-1.5">
            <Radio className="w-4 h-4 text-[#4ADE80]" />
            <span>BLE Mesh Protocol v2</span>
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 font-sans">Offline Mesh Relay & Route Cache</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Peer-to-peer 100m BLE packet relay ensuring communication when cellular signal drops.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            className={`px-4 py-2 text-xs font-bold rounded-lg border flex items-center space-x-2 transition-all font-mono ${
              isOfflineMode
                ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                : 'bg-emerald-950/60 text-[#4ADE80] border-emerald-800'
            }`}
          >
            {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{isOfflineMode ? 'Offline Simulation Active' : 'Online (4G / 5G / Wi-Fi)'}</span>
          </button>

          {isOfflineMode && (
            <button
              onClick={handleSyncOfflineQueue}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Cached Safe Route Display */}
      {activeTrip?.selectedRoute ? (
        <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-5 sm:p-6 shadow space-y-3">
          <span className="text-[10px] font-bold uppercase text-[#4ADE80] tracking-widest block">
            Persistent Offline Route Cache
          </span>
          <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white">{activeTrip.selectedRoute.routeName}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{activeTrip.selectedRoute.distanceKm} km • {activeTrip.selectedRoute.estimatedTimeMins} mins estimated</p>
            </div>
            <span className="bg-emerald-950/60 text-[#4ADE80] border border-emerald-800 text-[10px] font-bold uppercase px-3 py-1 rounded self-start sm:self-center">
              Cached for Offline Use
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 text-center text-xs text-slate-400 shadow">
          No approved route locked yet. Select an approved route in the Safety Guide to cache it for offline expeditions.
        </div>
      )}

      {/* Nearby BLE Peer-to-Peer Chat & Alert Queue */}
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow space-y-4">
        <div className="border-b border-[#2D3139] pb-3">
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#4ADE80]">Mesh Telemetry</span>
          <h3 className="text-sm font-bold text-white mt-0.5 font-sans">Peer-to-Peer Packet Queue (100m Radius)</h3>
        </div>

        <div className="bg-[#0A0B0E] border border-[#2D3139] rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto space-y-2.5">
          {messages.length > 0 ? (
            messages.map(m => (
              <div
                key={m.id}
                className={`p-3 rounded-lg border text-xs max-w-md ${
                  m.senderId === currentUser.id
                    ? 'bg-[#1A1D24] text-white border-[#4ADE80] ml-auto'
                    : 'bg-[#11141A] border-[#2D3139] text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1 text-[10px]">
                  <span className={m.senderId === currentUser.id ? 'text-[#4ADE80]' : 'text-white'}>
                    {m.senderName}
                  </span>
                  <span className={`flex items-center space-x-1 ${m.senderId === currentUser.id ? 'text-slate-400' : 'text-slate-400'}`}>
                    <span>{m.timestamp}</span>
                    {!m.synced && <span className="text-amber-400 font-bold">[Queued]</span>}
                  </span>
                </div>
                <p className="leading-relaxed">{m.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              No offline mesh packets yet. Broadcast a packet or message below to simulate peer transmission.
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isOfflineMode ? "Queue offline BLE mesh packet..." : "Broadcast expedition message..."}
            className="flex-1 bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs px-3.5 py-2.5 focus:outline-none focus:border-[#4ADE80]"
          />
          <button
            onClick={handleSendMessage}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center space-x-1.5 shadow shrink-0 font-mono"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transmit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
