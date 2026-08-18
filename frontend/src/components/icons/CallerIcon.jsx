import React from 'react';

export default function CallerIcon({ className = "w-16 h-16 text-slate-200" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Handset/Headset Sketch */}
      <path d="M16 28 C16 16 22 10 32 10 C42 10 48 16 48 28" />
      <rect x="12" y="26" width="8" height="16" rx="4" strokeDasharray="30" />
      <rect x="44" y="26" width="8" height="16" rx="4" strokeDasharray="30" />
      <path d="M48 40 C48 48 42 52 32 52 H26" strokeDasharray="4 2" />
      <circle cx="23" cy="52" r="3" />
    </svg>
  );
}
