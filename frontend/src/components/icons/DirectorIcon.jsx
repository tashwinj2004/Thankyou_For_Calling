import React from 'react';

export default function DirectorIcon({ className = "w-16 h-16 text-slate-200" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Executive Briefcase + Award Badge Sketch */}
      <rect x="12" y="22" width="40" height="28" rx="4" />
      <path d="M24 22 V16 C24 13.8 25.8 12 28 12 H36 C38.2 12 40 13.8 40 16 V22" strokeDasharray="40" />
      <path d="M12 34 H52 M32 22 V50" strokeDasharray="3 3" />
      <circle cx="32" cy="34" r="4" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}
