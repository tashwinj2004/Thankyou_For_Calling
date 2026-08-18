import React from 'react';

export default function AdminIcon({ className = "w-16 h-16 text-slate-200" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Hand-drawn / Sketch Shield and Gear */}
      <path d="M32 6 L50 14 C50 34 40 50 32 58 C24 50 14 34 14 14 Z" strokeDasharray="100" strokeDashoffset="0" />
      <circle cx="32" cy="30" r="8" strokeDasharray="3 3" />
      <path d="M32 20 V17 M32 40 V43 M22 30 H19 M42 30 H45 M25 23 L23 21 M39 37 L41 39 M25 37 L23 39 M39 23 L41 21" />
    </svg>
  );
}
