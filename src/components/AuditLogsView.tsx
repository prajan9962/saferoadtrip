import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { Shield, Clock, FileText, RefreshCw, UserCheck } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/audit-logs');
      const data = await res.json();
      if (data.auditLogs) {
        setLogs(data.auditLogs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="bg-[#0F1218] border border-[#2D3139] rounded-xl p-6 sm:p-8 shadow space-y-6 max-w-4xl mx-auto font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2D3139] pb-5">
        <div>
          <span className="text-[10px] font-bold uppercase text-[#4ADE80] tracking-widest block">Security & Compliance</span>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center space-x-2 font-sans">
            <Shield className="w-5 h-5 text-[#4ADE80]" />
            <span>Immutable Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            System tamper-evident action logs, access records, and emergency events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="bg-[#1A1D24] hover:bg-[#252932] text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-[#2D3139] transition-colors flex items-center space-x-1.5 self-start sm:self-center font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#4ADE80] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="p-8 text-center bg-[#11141A] rounded-lg border border-[#2D3139] text-xs text-slate-500">
            No audit records found.
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="bg-[#11141A] border border-[#2D3139] rounded-lg p-4 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="text-[#4ADE80] font-mono text-xs uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {log.action}
                </span>
                <span className="text-slate-500 text-[11px] flex items-center space-x-1 font-normal">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </span>
              </div>
              <div className="text-slate-400 text-xs flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Initiated by: <strong className="text-white font-semibold">{log.userName || log.userId || 'System'}</strong></span>
              </div>
              {log.details && (
                <pre className="text-[11px] font-mono text-slate-300 bg-[#0A0B0E] p-3 rounded border border-[#2D3139] overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
