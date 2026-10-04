import React, { useState, useEffect, useRef } from 'react';
import { Trip, UserProfile, TripMember, TripMessage } from '../types';
import { MessageSquare, Send, Shield, User, Clock, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface TripChatProps {
  activeTrip: Trip | null;
  currentUser: UserProfile;
  members: TripMember[];
}

export const TripChat: React.FC<TripChatProps> = ({
  activeTrip,
  currentUser,
  members
}) => {
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (showLoading = false) => {
    if (!activeTrip) return;
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/trips/${activeTrip.id}/messages`, {
        headers: { Authorization: `Bearer ${currentUser.firebaseUid}` }
      });

      if (res.status === 403) {
        setError('You are not authorized to view this trip chat. Membership required.');
        setMessages([]);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load trip messages.');
      }

      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Fetch messages error:', err);
      if (showLoading) {
        setError(err.message || 'Unable to connect to trip message server.');
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Initial fetch and automatic polling every 3 seconds
  useEffect(() => {
    if (activeTrip) {
      fetchMessages(true);
      const interval = setInterval(() => {
        fetchMessages(false);
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [activeTrip?.id, currentUser.firebaseUid]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeTrip || isSending) return;

    const messageContent = inputText.trim();
    setInputText('');
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/trips/${activeTrip.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.firebaseUid}`
        },
        body: JSON.stringify({ message: messageContent })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to send message.');
      }

      const result = await res.json();
      if (result.message) {
        setMessages(prev => [...prev, result.message]);
      } else {
        await fetchMessages(false);
      }
    } catch (err: any) {
      console.error('Send message error:', err);
      setError(err.message || 'Failed to deliver message.');
      setInputText(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  // No Active Trip State
  if (!activeTrip) {
    return (
      <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-12 text-center max-w-2xl mx-auto space-y-4 font-mono shadow">
        <div className="w-12 h-12 bg-[#1A1D24] rounded-xl text-slate-400 mx-auto flex items-center justify-center border border-[#2D3139]">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#4ADE80] block">No Active Expedition</span>
          <h3 className="text-base font-bold text-white font-sans mt-1">Expedition Group Messaging</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Create an expedition or join with an approved code to communicate with all team members in real-time.
          </p>
        </div>
      </div>
    );
  }

  const isLeader = activeTrip.leaderId === currentUser.id;
  const approvedMembersCount = members.filter(m => m.status === 'APPROVED').length;

  return (
    <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl shadow-lg flex flex-col h-[650px] max-w-4xl mx-auto overflow-hidden font-mono">
      {/* Chat Header */}
      <div className="p-4 sm:p-5 border-b border-[#2D3139] bg-[#11141A] flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800 text-[#4ADE80] flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white font-sans">
                {activeTrip.destination}
              </h2>
              <span className="text-[10px] bg-[#1A1D24] text-slate-300 border border-[#2D3139] px-2 py-0.5 rounded font-mono font-bold">
                Code: {activeTrip.code}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5 font-mono">
              <span>{approvedMembersCount} Members</span>
              <span>•</span>
              <span className="text-[#4ADE80] flex items-center space-x-1 font-medium">
                <Shield className="w-3 h-3 inline" />
                <span>Encrypted Channel</span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchMessages(true)}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-white hover:bg-[#1A1D24] rounded-lg transition-colors"
          title="Refresh Messages"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#4ADE80]' : ''}`} />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-950/60 border-b border-red-800 px-4 py-2 text-xs text-red-300 flex items-center space-x-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#0A0B0E]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 font-mono">
            <MessageSquare className="w-8 h-8 text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">No messages in this group yet.</p>
            <p className="text-xs text-slate-500">Send an update to stay connected with your team.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.senderId === currentUser.id;
            const isMsgFromLeader = msg.senderRole === 'LEADER';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} font-mono`}
              >
                {/* Sender Metadata */}
                <div className="flex items-center space-x-2 mb-1 px-1">
                  <span className="text-xs font-bold text-slate-200">
                    {isOwnMessage ? 'You' : msg.senderName}
                  </span>
                  {isMsgFromLeader ? (
                    <span className="text-[9px] font-bold uppercase bg-amber-950/60 text-amber-400 border border-amber-800 px-1.5 py-0.2 rounded">
                      Leader
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase bg-[#1A1D24] text-slate-400 border border-[#2D3139] px-1.5 py-0.2 rounded">
                      Member
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] p-3.5 text-xs sm:text-sm leading-relaxed rounded-xl shadow ${
                    isOwnMessage
                      ? 'bg-emerald-600 text-white rounded-br-xs'
                      : 'bg-[#11141A] border border-[#2D3139] text-slate-200 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.messageText}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 sm:p-4 bg-[#11141A] border-t border-[#2D3139] flex items-center space-x-2 font-mono"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message ${activeTrip.destination} group...`}
          disabled={isSending}
          className="flex-1 bg-[#0A0B0E] border border-[#2D3139] rounded-lg text-white text-xs sm:text-sm px-4 py-2.5 focus:outline-none focus:border-[#4ADE80] placeholder:text-slate-500 font-mono"
        />
        <button
          type="submit"
          disabled={isSending || !inputText.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-1.5 transition-colors shadow font-mono"
        >
          <span className="hidden sm:inline">Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
