'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function RoleCard({ title, subtitle, roleKey, imageSrc, href, accentColor = 'cyan' }) {
  const borderAccents = {
    cyan: 'hover:border-cyan-500/60 hover:shadow-cyan-500/20',
    emerald: 'hover:border-emerald-500/60 hover:shadow-emerald-500/20',
    indigo: 'hover:border-indigo-500/60 hover:shadow-indigo-500/20',
    amber: 'hover:border-amber-500/60 hover:shadow-amber-500/20',
  };

  const badgeAccents = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <Link
      href={href}
      className={`group relative flex flex-col items-center justify-between p-7 rounded-2xl glass-panel glass-panel-hover border border-white/10 ${borderAccents[accentColor]} cursor-pointer overflow-hidden text-center min-h-[340px]`}
    >
      {/* Background radial glow effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-white/5 blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500"></div>

      {/* Role Drawing Illustration */}
      <div className="relative w-full h-44 mb-5 rounded-xl overflow-hidden bg-slate-900/80 border border-white/10 group-hover:border-white/20 transition-all duration-300">
        <Image
          src={imageSrc}
          alt={`${title} Drawing Illustration`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-80"></div>
        <span className={`absolute bottom-3 left-3 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border backdrop-blur-md ${badgeAccents[accentColor]}`}>
          {roleKey.replace('_', ' ')}
        </span>
      </div>

      {/* Role Title and Subtitle */}
      <div className="flex flex-col items-center gap-1.5 z-10">
        <h2 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase group-hover:text-cyan-300 transition-colors">
          {title}
        </h2>
        <p className="text-xs text-slate-300 font-medium tracking-wide max-w-xs">
          {subtitle}
        </p>
      </div>

      {/* Action Button Label */}
      <div className="mt-5 w-full py-2.5 px-4 rounded-xl bg-white/5 group-hover:bg-cyan-500/20 border border-white/10 group-hover:border-cyan-400/40 text-xs font-bold uppercase tracking-widest text-slate-300 group-hover:text-cyan-200 transition-all">
        Enter Portal →
      </div>
    </Link>
  );
}
