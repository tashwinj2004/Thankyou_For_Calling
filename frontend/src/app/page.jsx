'use client';

import React from 'react';
import Header from '@/components/Header';
import RoleCard from '@/components/RoleCard';

export default function LandingPage() {
  const roles = [
    {
      title: 'ADMIN',
      roleKey: 'Admin',
      subtitle: 'System Provisioning, Security Roster & Call Staging Console',
      imageSrc: '/admin_avatar.png',
      href: '/login?role=Admin',
      accentColor: 'cyan',
    },
    {
      title: 'CALLER',
      roleKey: 'Advisor',
      subtitle: 'Evaluated Recordings, Growth Cards & Dispute Submissions',
      imageSrc: '/caller_avatar.png',
      href: '/login?role=Advisor',
      accentColor: 'emerald',
    },
    {
      title: 'TEAMLEADER',
      roleKey: 'Team_Leader',
      subtitle: 'Pod Operations, Call Quality Donut & Dispute Resolutions',
      imageSrc: '/teamleader_avatar.png',
      href: '/login?role=Team_Leader',
      accentColor: 'indigo',
    },
    {
      title: 'Senior Manager',
      roleKey: 'Director',
      subtitle: 'Enterprise KPIs, Performance Leaderboards & Dispute Logs',
      imageSrc: '/director_avatar.png',
      href: '/login?role=Director',
      accentColor: 'amber',
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-between pb-12">
      <Header subtitle="Enterprise Sales-Call Intelligence & Performance Portal" />

      <div className="w-full max-w-5xl px-6 my-auto py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {roles.map((r) => (
            <RoleCard
              key={r.title}
              title={r.title}
              subtitle={r.subtitle}
              roleKey={r.roleKey}
              imageSrc={r.imageSrc}
              href={r.href}
              accentColor={r.accentColor}
            />
          ))}
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 font-medium tracking-wide border-t border-white/10 pt-4 w-full max-w-5xl px-6">
        Thankyou For Calling Platform — Enterprise Next.js Frontend
      </footer>
    </main>
  );
}
