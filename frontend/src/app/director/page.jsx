'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import client from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function DirectorDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [activeDisputes, setActiveDisputes] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'Director') {
        router.push('/login?role=Director');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [resAnalytics, resCalls] = await Promise.all([
        client.get(ENDPOINTS.DIRECTOR_ANALYTICS),
        client.get(ENDPOINTS.CALLS),
      ]);
      setAnalytics(resAnalytics.data);
      const calls = resCalls.data?.calls || [];
      setActiveDisputes(calls.filter((c) => c.disputed));
    } catch (err) {
      console.error('Error loading director analytics:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const metrics = analytics?.metrics || {
    total_evaluated_volume: 0,
    global_average_score: 0,
    active_pending_disputes: 0,
  };

  const topAdv = analytics?.top_advisor;
  const botAdv = analytics?.bottom_advisor;
  const distribution = analytics?.distribution || {};
  const leaderboard = analytics?.leaderboard || [];
  const advisorScores = analytics?.advisor_scores || [];

  // Donut data
  const donutData = useMemo(() => {
    return [
      { name: 'Good', value: distribution.Good || 0, color: '#2ecc71' },
      { name: 'Okay', value: distribution.Okay || 0, color: '#f1c40f' },
      { name: 'Bad', value: distribution.Bad || 0, color: '#e74c3c' },
    ].filter((d) => d.value > 0);
  }, [distribution]);

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-[#2B5298] flex items-center justify-center text-white">
        <p className="text-lg font-medium tracking-wide">Loading Senior Director Portal...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center pb-12">
      <Header showBackHome={true} subtitle="Executive Insights & Organizational Performance" />

      <div className="w-full max-w-6xl px-6 py-8 flex flex-col gap-8">
        {/* Row 1: 3 Core KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-6 text-center shadow-xl">
            <span className="text-xs uppercase font-bold tracking-widest text-slate-400">Total Evaluated Calls</span>
            <div className="text-4xl font-extrabold text-white mt-2">{metrics.total_evaluated_volume}</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-6 text-center shadow-xl">
            <span className="text-xs uppercase font-bold tracking-widest text-slate-400">Global Average Score</span>
            <div className="text-4xl font-extrabold text-cyan-400 mt-2">{metrics.global_average_score} / 10</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-amber-500/30 p-6 text-center shadow-xl">
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">Active Pending Disputes</span>
            <div className="text-4xl font-extrabold text-amber-300 mt-2">{metrics.active_pending_disputes}</div>
          </div>
        </div>

        {/* Row 2: Top Performer, Needs Coaching, Donut */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Performer */}
          <div className="rounded-2xl bg-emerald-950/30 border-2 border-emerald-500/50 p-6 text-center flex flex-col justify-between shadow-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">🏆 Top Performer</span>
            {topAdv ? (
              <div className="my-4">
                <h4 className="text-xl font-bold text-white">{topAdv.advisor_name}</h4>
                <div className="text-3xl font-black text-emerald-400 mt-1">{topAdv.average_score}/10</div>
                <p className="text-xs text-slate-400 mt-2">Team: {topAdv.team_leader}</p>
                <p className="text-xs text-slate-400">{topAdv.call_count} call(s) evaluated</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 my-6">Evaluations needed</p>
            )}
          </div>

          {/* Needs Coaching */}
          <div className="rounded-2xl bg-red-950/30 border-2 border-red-500/50 p-6 text-center flex flex-col justify-between shadow-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">🎯 Needs Coaching</span>
            {botAdv ? (
              <div className="my-4">
                <h4 className="text-xl font-bold text-white">{botAdv.advisor_name}</h4>
                <div className="text-3xl font-black text-red-400 mt-1">{botAdv.average_score}/10</div>
                <p className="text-xs text-slate-400 mt-2">Team: {botAdv.team_leader}</p>
                <p className="text-xs text-slate-400">{botAdv.call_count} call(s) evaluated</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 my-6">Evaluations needed</p>
            )}
          </div>

          {/* Org Donut */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-6 shadow-xl flex flex-col items-center justify-center">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Org-wide Call Quality Distribution
            </h4>
            {donutData.length > 0 ? (
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 my-auto">No completed calls yet</p>
            )}
          </div>
        </div>

        {/* Row 3: Bar Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Leader Performance Bar */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-6 shadow-xl">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
              Team Leader Performance
            </h4>
            {leaderboard.length > 0 ? (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaderboard}>
                    <XAxis dataKey="team_leader" stroke="#888888" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 10]} stroke="#888888" />
                    <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '8px' }} />
                    <Bar dataKey="average_score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-12 text-center">Team data will appear once calls are evaluated.</p>
            )}
          </div>

          {/* Advisor Score Ranking Horizontal Bar */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-6 shadow-xl">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
              Advisor Score Ranking
            </h4>
            {advisorScores.length > 0 ? (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={advisorScores}>
                    <XAxis type="number" domain={[0, 10]} stroke="#888888" />
                    <YAxis dataKey="advisor_name" type="category" stroke="#888888" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '8px' }} />
                    <Bar dataKey="average_score" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-12 text-center">Advisor scores will appear after calls are evaluated.</p>
            )}
          </div>
        </div>

        {/* Row 4: Roster Leaderboard Table */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-6 shadow-xl">
          <h4 className="text-lg font-bold text-white mb-4">Roster Performance Leaderboard</h4>
          {leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-black/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-3">Team Leader</th>
                    <th className="p-3">Advisors</th>
                    <th className="p-3">Calls Evaluated</th>
                    <th className="p-3">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboard.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-3 font-semibold text-white">{row.team_leader}</td>
                      <td className="p-3">{row.advisor_count}</td>
                      <td className="p-3">{row.evaluated_calls}</td>
                      <td className="p-3 font-bold text-cyan-400">{row.average_score ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">No data available.</p>
          )}
        </div>

        {/* Active Disputes Log */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-amber-500/30 p-6 shadow-xl">
          <h4 className="text-lg font-bold text-amber-400 mb-2">🚩 Active Dispute Log</h4>
          <p className="text-xs text-slate-400 mb-4">Calls currently contested by advisors.</p>
          {activeDisputes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {activeDisputes.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-black/60 border border-amber-500/20">
                  <div className="font-bold text-white text-sm">
                    🚩 {c.advisor_name} — {c.filename} — Score: {c.score}/10 ({c.tag})
                  </div>
                  <p className="text-xs text-amber-200 mt-1 italic">"{c.dispute_reason || '—'}"</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs text-center">
              ✅ No active disputes — all calls are clear.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
