import React, { useState } from 'react';
import { UserProfile, NotificationItem } from '../types';
import {
  Shield,
  Bell,
  User,
  AlertTriangle,
  Radio,
  MapPin,
  Sparkles,
  Compass,
  MessageSquare,
  ShieldAlert,
  ChevronDown,
  Menu,
  X,
  Activity,
  CheckCircle2,
  FileCode2
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onSwitchUser: (userId: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  notifications: NotificationItem[];
  onTriggerSos: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  users,
  onSwitchUser,
  activeTab,
  onSelectTab,
  notifications,
  onTriggerSos
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const navItems = [
    { id: 'map', label: 'Safe Map', icon: Compass },
    { id: 'trip', label: 'Trips', icon: Shield },
    { id: 'bubble', label: 'Safe Bubble', icon: MapPin },
    { id: 'ai-guide', label: 'Safety Guide', icon: Sparkles },
    { id: 'chat', label: 'Group Chat', icon: MessageSquare },
    { id: 'contact', label: 'Emergency Contact', icon: ShieldAlert },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'offline', label: 'Offline Mesh', icon: Radio },
    { id: 'authority', label: 'Dispatch Hub', icon: Activity },
    { id: 'sos-tests', label: 'Test Suite', icon: FileCode2 }
  ];

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  const isLeader = currentUser.id.includes('leader');

  return (
    <header className="bg-[#0F1218] border-b border-[#2D3139] text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleTabClick('trip')}
              className="flex items-center space-x-2 group focus:outline-none"
              id="header-brand-logo"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1A1D24] border border-[#2D3139] flex items-center justify-center text-[#4ADE80] group-hover:border-[#4ADE80] transition-colors">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-base font-bold font-mono tracking-wider text-white">SafeRoad<span className="text-[#4ADE80]">+</span></span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950/60 text-[#4ADE80] border border-emerald-800/60">
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono hidden sm:block">AI Tourist Safety Grid</p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-1 bg-[#0A0B0E] p-1 rounded-lg border border-[#2D3139]">
            {navItems.slice(0, 7).map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center space-x-1.5 transition-all ${
                    isActive
                      ? 'bg-[#1A1D24] text-[#4ADE80] border border-[#2D3139] font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#1A1D24]'
                  }`}
                  id={`nav-tab-${tab.id}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#4ADE80]' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* SOS Trigger Button */}
            <button
              onClick={onTriggerSos}
              className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center space-x-2 shadow-lg shadow-red-600/30 animate-sos-pulse font-mono"
              id="header-sos-btn"
            >
              <AlertTriangle className="w-4 h-4 fill-white text-red-600 shrink-0" />
              <span className="tracking-wider">SOS ALERT</span>
            </button>

            {/* User Switcher Dropdown */}
            <div className="hidden sm:flex items-center bg-[#1A1D24] border border-[#2D3139] rounded-lg px-2.5 py-1.5 relative">
              <div className="w-5 h-5 rounded-full bg-[#2D3139] text-[#4ADE80] flex items-center justify-center font-mono font-bold text-[11px] mr-2">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex flex-col text-left mr-1">
                <span className="text-xs font-semibold text-slate-200 leading-none truncate max-w-[100px]">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isLeader ? 'Leader' : 'Member'}
                </span>
              </div>
              <select
                value={currentUser.id}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                id="user-switcher-select"
                title="Switch User Profile"
                aria-label="Switch User Profile"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-[#0F1218] text-white">
                    {u.name} ({u.id.includes('leader') ? 'Trip Leader' : 'Member'})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Notifications Button */}
            <button
              onClick={() => handleTabClick('notifications')}
              className={`relative p-2 rounded-lg border transition-all ${
                activeTab === 'notifications'
                  ? 'bg-[#1A1D24] text-[#4ADE80] border-[#4ADE80]'
                  : 'bg-[#1A1D24] hover:bg-[#252932] text-slate-300 border-[#2D3139]'
              }`}
              title="Notifications"
              id="header-notifications-btn"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Mobile / Extra Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#1A1D24] hover:bg-[#252932] text-slate-300 border border-[#2D3139] transition-colors"
              id="header-menu-toggle-btn"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Secondary Navigation Scrollbar for Tablet / Medium screens */}
        <div className="hidden md:flex xl:hidden overflow-x-auto py-2 border-t border-[#2D3139] space-x-1 no-scrollbar">
          {navItems.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`whitespace-nowrap px-3 py-1 rounded-md text-xs font-mono flex items-center space-x-1.5 transition-all ${
                  isActive
                    ? 'bg-[#1A1D24] text-[#4ADE80] border border-[#2D3139] font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#4ADE80]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer / Expanded Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[#2D3139] bg-[#0F1218] px-4 pt-3 pb-5 shadow-2xl space-y-3">
          {/* User Profile Pill in Mobile */}
          <div className="sm:hidden flex items-center justify-between p-3 bg-[#11141A] rounded-lg border border-[#2D3139]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-[#2D3139] text-[#4ADE80] flex items-center justify-center font-mono font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{isLeader ? 'Trip Leader' : 'Traveler'}</p>
              </div>
            </div>
            <select
              value={currentUser.id}
              onChange={(e) => {
                onSwitchUser(e.target.value);
                setMobileMenuOpen(false);
              }}
              className="bg-[#1A1D24] border border-[#2D3139] text-xs font-mono rounded px-2 py-1 text-slate-200"
            >
              {users.map(u => (
                <option key={u.id} value={u.id} className="bg-[#0F1218] text-white">
                  {u.name} ({u.id.includes('leader') ? 'Leader' : 'Member'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {navItems.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`p-2.5 rounded-lg text-left flex items-center space-x-2 border transition-all ${
                    isActive
                      ? 'bg-[#1A1D24] text-[#4ADE80] border-[#4ADE80] font-semibold'
                      : 'bg-[#11141A] hover:bg-[#1A1D24] text-slate-300 border-[#2D3139]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#4ADE80]' : 'text-slate-400'}`} />
                  <span className="text-xs font-mono">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
