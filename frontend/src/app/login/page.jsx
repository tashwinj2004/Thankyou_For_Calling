'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import client from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') || 'Admin';
  const { login, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roleMetaMap = {
    Admin: { title: 'ADMIN LOGIN', image: '/admin_avatar.png', redirect: '/admin', color: 'cyan' },
    Advisor: { title: 'CALLER LOGIN', image: '/caller_avatar.png', redirect: '/caller', color: 'emerald' },
    Team_Leader: { title: 'TEAMLEADER LOGIN', image: '/teamleader_avatar.png', redirect: '/teamleader', color: 'indigo' },
    Director: { title: 'SENIOR MANAGER LOGIN', image: '/director_avatar.png', redirect: '/director', color: 'amber' },
  };

  useEffect(() => {
    if (user) {
      const meta = roleMetaMap[user.role];
      router.push(meta ? meta.redirect : '/');
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await client.post(ENDPOINTS.LOGIN, {
        email: email.trim(),
        password: password,
      });

      const { access_token, user: loggedUser } = response.data;

      if (loggedUser.role !== roleParam) {
        setError(`These credentials belong to a ${loggedUser.role.replace('_', ' ')} account, not ${roleParam.replace('_', ' ')}.`);
        setLoading(false);
        return;
      }

      login(access_token, loggedUser);
      const meta = roleMetaMap[loggedUser.role];
      router.push(meta ? meta.redirect : '/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const meta = roleMetaMap[roleParam] || roleMetaMap.Admin;

  return (
    <main className="min-h-screen flex flex-col items-center justify-between pb-12">
      <Header showBackHome={true} />

      <div className="w-full max-w-md px-6 my-auto">
        <div className="rounded-2xl glass-panel p-8 shadow-2xl border border-white/15">
          {/* Selected Role Drawing Artwork */}
          <div className="relative w-full h-36 mb-6 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
            <Image
              src={meta.image}
              alt={meta.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-90"></div>
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span className="px-4 py-1 rounded-full text-xs font-black tracking-widest text-cyan-300 bg-black/70 border border-cyan-500/40 uppercase">
                {meta.title}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@thankyouforcalling.com"
                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold tracking-widest uppercase text-xs shadow-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In To Portal'}
            </button>
          </form>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 font-medium tracking-wide">
        Thankyou For Calling Platform — Secure Enterprise Portal
      </footer>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading Portal...</div>}>
      <LoginContent />
    </Suspense>
  );
}
