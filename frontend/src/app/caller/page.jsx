'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import client from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';

export default function CallerDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [calls, setCalls] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [expandedCallId, setExpandedCallId] = useState(null);
  const [insightsMap, setInsightsMap] = useState({});
  const [disputeReasons, setDisputeReasons] = useState({});
  const [disputeStatusMap, setDisputeStatusMap] = useState({});

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'Advisor') {
        router.push('/login?role=Advisor');
      } else {
        fetchCalls();
      }
    }
  }, [user, authLoading, router]);

  const fetchCalls = async () => {
    try {
      setLoadingCalls(true);
      const res = await client.get(ENDPOINTS.CALLS);
      const list = res.data?.calls || [];
      const completed = list.filter((c) => c.status === 'Completed');
      setCalls(completed);
    } catch (err) {
      console.error('Error loading calls:', err);
    } finally {
      setLoadingCalls(false);
    }
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
        console.error(`Error loading insights for call ${callId}:`, err);
      }
    }
  };

  const handleDisputeSubmit = async (e, callId) => {
    e.preventDefault();
    const reason = disputeReasons[callId];
    if (!reason || !reason.trim()) return;

    try {
      await client.post(ENDPOINTS.DISPUTE(callId), { reason: reason.trim() });
      setDisputeStatusMap((prev) => ({
        ...prev,
        [callId]: { type: 'success', msg: 'Dispute submitted successfully.' },
      }));
      fetchCalls();
    } catch (err) {
      setDisputeStatusMap((prev) => ({
        ...prev,
        [callId]: { type: 'error', msg: err.message || 'Submission failed' },
      }));
    }
  };

  const handleDownloadTranscript = (callId, filename, text) => {
    const element = document.createElement('a');
    const file = new Blob([text || ''], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `transcript_call_${callId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getScoreDot = (tag) => {
    if (tag === 'Good') return '🟢';
    if (tag === 'Okay') return '🟡';
    if (tag === 'Bad') return '🔴';
    return '⚪';
  };

  if (authLoading || loadingCalls) {
    return (
      <div className="min-h-screen bg-[#2B5298] flex items-center justify-center text-white">
        <p className="text-lg font-medium tracking-wide">Loading Caller Dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center pb-12">
      <Header showBackHome={true} subtitle={`Advisor Portal — Signed in as ${user?.full_name}`} />

      <div className="w-full max-w-5xl px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-6 tracking-wide border-b border-white/10 pb-4">
          My Evaluated Call Recordings
        </h2>

        {calls.length === 0 ? (
          <div className="rounded-2xl bg-black/40 border border-white/10 p-8 text-center text-slate-300">
            No completed calls assigned to your account yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {calls.map((call) => {
              const isExpanded = expandedCallId === call.id;
              const insights = insightsMap[call.id];
              const dot = getScoreDot(call.tag);
              const score = call.score ? call.score.toFixed(1) : '0.0';

              return (
                <div
                  key={call.id}
                  className="rounded-xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 overflow-hidden shadow-xl"
                >
                  <button
                    onClick={() => toggleExpand(call.id)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xl">{dot}</span>
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          {call.advisor_name} — Score: {score}/10 — {call.tag}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{call.filename}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {call.disputed && (
                        <span className="text-xs px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-semibold">
                          🚩 Disputed
                        </span>
                      )}
                      <span className="text-slate-400 text-sm">{isExpanded ? '▲ Hide Details' : '▼ View Insights'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 py-6 border-t border-white/10 bg-black/40 flex flex-col gap-6">
                      {/* Growth / Improvement Areas */}
                      <div>
                        <h4 className="text-sm font-bold text-red-400 tracking-wider uppercase mb-3">
                          ⚠️ NEED FOR IMPROVEMENT
                        </h4>
                        {insights?.improvements && insights.improvements.length > 0 ? (
                          insights.improvements.map((item, idx) => (
                            <div key={idx} className="card-red">
                              {item}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">No specific improvement points identified.</p>
                        )}
                      </div>

                      {/* Transcription */}
                      {insights?.transcript_text && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-200 tracking-wider uppercase mb-3">
                            📄 Transcription
                          </h4>
                          <textarea
                            readOnly
                            rows={8}
                            value={insights.transcript_text}
                            className="w-full p-4 rounded-lg bg-black/70 border border-white/10 text-slate-300 font-mono text-xs focus:outline-none resize-y"
                          />
                          <div className="mt-3 flex items-center justify-between">
                            <button
                              onClick={() => handleDownloadTranscript(call.id, call.filename, insights.transcript_text)}
                              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white font-semibold transition-colors cursor-pointer"
                            >
                              📥 Download Transcript
                            </button>
                            <span className="text-xs text-slate-500 font-mono">📁 {call.filename}</span>
                          </div>
                        </div>
                      )}

                      {/* Dispute Form */}
                      <div className="pt-4 border-t border-white/10">
                        <h4 className="text-sm font-bold text-amber-400 tracking-wider uppercase mb-3">
                          Contest Compliance Markers
                        </h4>

                        {disputeStatusMap[call.id]?.msg && (
                          <div
                            className={`mb-4 p-3 rounded-lg text-xs ${
                              disputeStatusMap[call.id].type === 'success'
                                ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                                : 'bg-red-950/80 border border-red-500/50 text-red-200'
                            }`}
                          >
                            {disputeStatusMap[call.id].msg}
                          </div>
                        )}

                        <form onSubmit={(e) => handleDisputeSubmit(e, call.id)} className="flex flex-col gap-3">
                          <textarea
                            rows={3}
                            placeholder="Provide reason for contesting the compliance score..."
                            value={disputeReasons[call.id] || ''}
                            onChange={(e) =>
                              setDisputeReasons((prev) => ({ ...prev, [call.id]: e.target.value }))
                            }
                            className="w-full p-3 rounded-lg bg-black/60 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="submit"
                            className="self-start px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Submit Dispute
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
