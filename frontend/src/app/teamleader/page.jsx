'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import client from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function TeamLeaderDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [calls, setCalls] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedAdvisors, setSelectedAdvisors] = useState([]);
  const [expandedCallId, setExpandedCallId] = useState(null);
  const [insightsMap, setInsightsMap] = useState({});
  const [resolutionNotes, setResolutionNotes] = useState({});
  const [resolveStatusMap, setResolveStatusMap] = useState({});

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'Team_Leader') {
        router.push('/login?role=Team_Leader');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [resCalls, resAdvisors] = await Promise.all([
        client.get(ENDPOINTS.CALLS),
        client.get(ENDPOINTS.MY_ADVISORS),
      ]);
      setCalls(resCalls.data?.calls || []);
      setAdvisors(resAdvisors.data || []);
    } catch (err) {
      console.error('Error fetching pod data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleAdvisorFilter = (name) => {
    setSelectedAdvisors((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const toggleExpand = async (callId) => {
    if (expandedCallId === callId) {
      setExpandedCallId(null);
      return;
    }
    setExpandedCallId(callId);
    if (!insightsMap[callId]) {
      try {
        const res = await client.get(ENDPOINTS.INSIGHTS(callId));
        setInsightsMap((prev) => ({ ...prev, [callId]: res.data }));
      } catch (err) {
        console.error(`Error fetching insights for call ${callId}:`, err);
      }
    }
  };

  const handleResolveDispute = async (e, callId) => {
    e.preventDefault();
    const note = resolutionNotes[callId] || 'Reviewed and confirmed — score stands.';

    try {
      await client.post(ENDPOINTS.RESOLVE_DISPUTE(callId), { resolution_note: note });
      setResolveStatusMap((prev) => ({
        ...prev,
        [callId]: { type: 'success', msg: 'Dispute resolved successfully.' },
      }));
      fetchData();
    } catch (err) {
      setResolveStatusMap((prev) => ({
        ...prev,
        [callId]: { type: 'error', msg: err.message || 'Resolution failed' },
      }));
    }
  };

  // Filter calls
  const filteredCalls = useMemo(() => {
    let list = calls;
    if (selectedAdvisors.length > 0) {
      list = list.filter((c) => selectedAdvisors.includes(c.advisor_name));
    }
    return list.sort((a, b) => (a.advisor_name || '').localeCompare(b.advisor_name || ''));
  }, [calls, selectedAdvisors]);

  // Donut chart data
  const chartData = useMemo(() => {
    const completed = calls.filter((c) => c.status === 'Completed' && c.tag);
    const counts = { Good: 0, Okay: 0, Bad: 0 };
    completed.forEach((c) => {
      if (counts[c.tag] !== undefined) counts[c.tag]++;
    });
    return [
      { name: 'Good', value: counts.Good, color: '#2ecc71' },
      { name: 'Okay', value: counts.Okay, color: '#f39c12' },
      { name: 'Bad', value: counts.Bad, color: '#e74c3c' },
    ].filter((d) => d.value > 0);
  }, [calls]);

  const activeDisputes = useMemo(() => calls.filter((c) => c.disputed), [calls]);

  const getScoreDot = (tag) => {
    if (tag === 'Good') return '🟢';
    if (tag === 'Okay') return '🟡';
    if (tag === 'Bad') return '🔴';
    return '⚪';
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-[#2B5298] flex items-center justify-center text-white">
        <p className="text-lg font-medium tracking-wide">Loading Team Leader Dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center pb-12">
      <Header showBackHome={true} subtitle={`Team Leader Portal — Pod Supervisor`} />

      <div className="w-full max-w-6xl px-6 py-8 flex flex-col gap-8">
        {/* Top summary row: Filter + Pod Quality Donut */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pod Roster & Filter */}
          <div className="md:col-span-2 rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2">My Pod — {advisors.length} Advisors</h3>
            <p className="text-xs text-slate-400 mb-4">Click advisor names to filter evaluation call list below:</p>

            <div className="flex flex-wrap gap-2">
              {advisors.map((adv) => {
                const isSelected = selectedAdvisors.includes(adv.full_name);
                return (
                  <button
                    key={adv.id}
                    onClick={() => toggleAdvisorFilter(adv.full_name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                        : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}
                    {adv.full_name}
                  </button>
                );
              })}
              {selectedAdvisors.length > 0 && (
                <button
                  onClick={() => setSelectedAdvisors([])}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/60 border border-red-500/30 text-red-300 hover:bg-red-900/80 cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          {/* Pod Donut Chart */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-6 shadow-xl flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Pod Call Quality</h3>
            {chartData.length > 0 ? (
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '8px', border: '1px solid #333' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 my-auto">No evaluated calls yet.</p>
            )}
          </div>
        </div>

        {/* Call Recordings List */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-6 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">
            Evaluated Pod Call Recordings ({filteredCalls.length})
          </h3>

          {filteredCalls.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No calls match the selected filter.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredCalls.map((call) => {
                const isExpanded = expandedCallId === call.id;
                const insights = insightsMap[call.id];
                const dot = getScoreDot(call.tag);
                const score = call.score ? call.score.toFixed(1) : '0.0';

                return (
                  <div key={call.id} className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                    <button
                      onClick={() => toggleExpand(call.id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{dot}</span>
                        <div>
                          <span className="font-bold text-white">
                            {call.advisor_name} — {score}/10 — {call.tag}
                          </span>
                          <span className="text-xs text-slate-400 font-mono ml-3">({call.filename})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {call.disputed && (
                          <span className="text-xs px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-semibold">
                            🚩 Disputed
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{isExpanded ? '▲ Hide' : '▼ View Insights'}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 py-6 border-t border-white/10 bg-black/60 flex flex-col gap-6">
                        {/* Excellence Cards */}
                        <div>
                          <h4 className="text-xs font-bold text-emerald-400 tracking-wider uppercase mb-2">
                            ✅ Areas of Excellence
                          </h4>
                          {insights?.excelled && insights.excelled.length > 0 ? (
                            insights.excelled.map((item, i) => (
                              <div key={i} className="card-green">
                                {item}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic">No specific excellence points identified.</p>
                          )}
                        </div>

                        {/* Growth Areas Cards */}
                        <div>
                          <h4 className="text-xs font-bold text-red-400 tracking-wider uppercase mb-2">
                            📈 Growth Areas
                          </h4>
                          {insights?.improvements && insights.improvements.length > 0 ? (
                            insights.improvements.map((item, i) => (
                              <div key={i} className="card-red">
                                {item}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic">No improvement points identified.</p>
                          )}
                        </div>

                        {/* Transcript */}
                        {insights?.transcript_text && (
                          <div>
                            <h4 className="text-xs font-bold text-slate-300 tracking-wider uppercase mb-2">
                              📄 Transcription
                            </h4>
                            <textarea
                              readOnly
                              rows={6}
                              value={insights.transcript_text}
                              className="w-full p-3 rounded-lg bg-black/80 border border-white/10 text-slate-300 font-mono text-xs focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Disputes Inbox */}
        {activeDisputes.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-amber-500/30 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2">
              🚩 Disputes Inbox ({activeDisputes.length} active)
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Review advisor contest reasons and enter resolution notes below.
            </p>

            <div className="flex flex-col gap-4">
              {activeDisputes.map((call) => (
                <div key={call.id} className="p-5 rounded-xl bg-black/60 border border-amber-500/20 flex flex-col gap-4">
                  <div>
                    <h4 className="font-bold text-white text-base">
                      🚩 {call.advisor_name} — {call.filename}
                    </h4>
                    <p className="text-xs text-amber-200 mt-2 bg-amber-950/40 p-3 rounded border border-amber-500/20 italic">
                      "{call.dispute_reason || '(no reason provided)'}"
                    </p>
                  </div>

                  {resolveStatusMap[call.id]?.msg && (
                    <div
                      className={`p-3 rounded-lg text-xs ${
                        resolveStatusMap[call.id].type === 'success'
                          ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                          : 'bg-red-950/80 border border-red-500/50 text-red-200'
                      }`}
                    >
                      {resolveStatusMap[call.id].msg}
                    </div>
                  )}

                  <form onSubmit={(e) => handleResolveDispute(e, call.id)} className="flex flex-col gap-3">
                    <textarea
                      rows={2}
                      value={resolutionNotes[call.id] || 'Reviewed and confirmed — score stands.'}
                      onChange={(e) =>
                        setResolutionNotes((prev) => ({ ...prev, [call.id]: e.target.value }))
                      }
                      placeholder="Resolution note..."
                      className="w-full p-3 rounded-lg bg-black/80 border border-white/15 text-white text-xs focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      className="self-start px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      ✅ Mark as Resolved
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
