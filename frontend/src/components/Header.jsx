'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Header({ showBackHome = false, subtitle = null }) {
  const { user, logout } = useAuth();

  return (
    <header className="w-full py-6 px-6 flex flex-col items-center justify-center text-center relative border-b border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl">
      <div className="max-w-6xl w-full flex items-center justify-between relative">
        {/* Left Action / Status */}
        <div className="flex items-center gap-3 min-w-[140px]">
          {showBackHome ? (
            <Link
              href="/"
              className="text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-white px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all flex items-center gap-1.5"
            >
              <span>←</span> Role Select
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ENTERPRISE NODE</span>
            </div>
          )}
        </div>

        {/* Center Title */}
        <div className="text-center flex-1 px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-wider text-white uppercase drop-shadow-lg">
            THANK YOU FOR CALLING
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-cyan-300/90 mt-1 font-semibold tracking-wide">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right User Actions */}
        <div className="flex items-center justify-end min-w-[140px]">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-bold text-slate-200 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-white/15">
                👤 {user.full_name} ({user.role.replace('_', ' ')})
              </span>
              <button
                onClick={logout}
                className="text-xs font-bold uppercase tracking-wider text-red-300 hover:text-white bg-red-950/80 hover:bg-red-600 px-3.5 py-1.5 rounded-xl border border-red-500/40 transition-all cursor-pointer shadow-lg"
              >
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
