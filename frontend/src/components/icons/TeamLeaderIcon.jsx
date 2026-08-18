import React from 'react';

export default function TeamLeaderIcon({ className = "w-16 h-16 text-slate-200" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Leadership hierarchy sketch */}
      <circle cx="32" cy="16" r="6" />
      <path d="M22 30 C22 25 26 24 32 24 C38 24 42 25 42 30 V34 H22 Z" />
      {/* Subordinates */}
      <circle cx="16" cy="42" r="4" />
      <path d="M8 54 C8 50 11 49 16 49 C21 49 24 50 24 54" />
      <circle cx="48" cy="42" r="4" />
      <path d="M40 54 C40 50 43 49 48 49 C53 49 56 50 56 54" />
      {/* Connecting sketch lines */}
      <path d="M32 34 V42 M20 38 L16 42 M44 38 L48 42" strokeDasharray="3 3" />
    </svg>
  );
}
