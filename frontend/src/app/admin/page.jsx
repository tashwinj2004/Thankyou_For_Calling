'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import client from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [leaders, setLeaders] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Provisioning form state
  const [provName, setProvName] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [provRole, setProvRole] = useState('Advisor');
  const [provLeaderId, setProvLeaderId] = useState('');
  const [provStatus, setProvStatus] = useState({ type: '', msg: '' });
  const [provSubmitting, setProvSubmitting] = useState(false);

  // Staging form state
  const [stageAdvisorId, setStageAdvisorId] = useState('');
  const [stageFiles, setStageFiles] = useState([]);
  const [stageStatus, setStageStatus] = useState({ type: '', msg: '' });
  const [stageSubmitting, setStageSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'Admin') {
        router.push('/login?role=Admin');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [resLeaders, resAdvisors] = await Promise.all([
        client.get(ENDPOINTS.TEAM_LEADERS),
        client.get(ENDPOINTS.ADVISORS),
      ]);
      setLeaders(resLeaders.data || []);
      setAdvisors(resAdvisors.data || []);
      if (resAdvisors.data && resAdvisors.data.length > 0) {
        setStageAdvisorId(resAdvisors.data[0].id.toString());
      }
    } catch (err) {
      console.error('Error loading roster:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleProvision = async (e) => {
    e.preventDefault();
    setProvStatus({ type: '', msg: '' });
    setProvSubmitting(true);

    try {
      const payload = {
        full_name: provName.trim(),
        email: provEmail.trim(),
        password: provPassword,
        role: provRole,
      };
      if (provRole === 'Advisor') {
        if (!provLeaderId) {
          throw new Error('Please select a Team Leader for the Advisor.');
        }
        payload.team_id = parseInt(provLeaderId, 10);
      }

      await client.post(ENDPOINTS.USERS, payload);
      setProvStatus({ type: 'success', msg: `Successfully provisioned ${provRole} account!` });
      setProvName('');
      setProvEmail('');
      setProvPassword('');
      fetchData();
    } catch (err) {
      setProvStatus({ type: 'error', msg: err.message || 'Provisioning failed' });
    } finally {
      setProvSubmitting(false);
    }
  };

  const handleStageCalls = async (e) => {
    e.preventDefault();
    setStageStatus({ type: '', msg: '' });

    if (!stageAdvisorId) {
      setStageStatus({ type: 'error', msg: 'Please select a target advisor.' });
      return;
    }
    if (!stageFiles || stageFiles.length === 0) {
      setStageStatus({ type: 'error', msg: 'Please upload at least one call audio file.' });
      return;
    }

    setStageSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('advisor_id', stageAdvisorId);
      Array.from(stageFiles).forEach((file) => {
        formData.append('files', file);
      });

      await client.post(ENDPOINTS.UPLOAD_CALLS, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStageStatus({
        type: 'success',
        msg: `✅ Staged ${stageFiles.length} call(s) — pipeline analysis started in background!`,
      });
      setStageFiles([]);
      // Reset file input element
      const fileInput = document.getElementById('audio-file-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setStageStatus({ type: 'error', msg: err.message || 'Staging calls failed' });
    } finally {
      setStageSubmitting(false);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-[#2B5298] flex items-center justify-center text-white">
        <p className="text-lg font-medium tracking-wide">Loading Admin Panel...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center pb-12">
      <Header showBackHome={true} subtitle="Ingestion & System Provisioning Console" />

      <div className="w-full max-w-6xl px-6 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Provision Console */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide border-b border-white/10 pb-4">
            System Provisioning Console
          </h2>
          <p className="text-xs text-slate-300 mb-6">Create new accounts for Advisors, Team Leaders, Directors, or Admins.</p>

          {provStatus.msg && (
            <div
              className={`mb-6 p-4 rounded-lg text-sm text-center ${
                provStatus.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/80 border border-red-500/50 text-red-200'
              }`}
            >
              {provStatus.msg}
            </div>
          )}

          <form onSubmit={handleProvision} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-2">Full Name</label>
              <input
                type="text"
                required
                value={provName}
                onChange={(e) => setProvName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-2">Email Address</label>
              <input
                type="email"
                required
                value={provEmail}
                onChange={(e) => setProvEmail(e.target.value)}
                placeholder="e.g. john@thankyouforcalling.com"
                className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-2">Password (Min 10 chars)</label>
              <input
                type="password"
                required
                minLength={10}
                value={provPassword}
                onChange={(e) => setProvPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-2">Role</label>
              <select
                value={provRole}
                onChange={(e) => setProvRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-sm"
              >
                <option value="Advisor">Advisor</option>
                <option value="Team_Leader">Team Leader</option>
                <option value="Director">Senior Director</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {provRole === 'Advisor' && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-2">Advisor's Team Leader</label>
                <select
                  required
                  value={provLeaderId}
                  onChange={(e) => setProvLeaderId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-sm"
                >
                  <option value="">Select a leader</option>
                  {leaders.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.full_name} (ID: {l.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={provSubmitting}
              className="mt-4 w-full py-3 px-6 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold tracking-wider uppercase text-sm shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {provSubmitting ? 'Provisioning...' : 'Provision Account'}
            </button>
          </form>
        </div>

        {/* Right Column: Call Staging Console */}
        <div className="rounded-2xl bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/10 p-8 shadow-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-wide border-b border-white/10 pb-4">
              Call Staging Console
            </h2>
            <p className="text-xs text-slate-300 mb-6">Upload raw call audio (.mp3, .wav, .m4a) to stage asynchronous background analysis.</p>

            {stageStatus.msg && (
              <div
                className={`mb-6 p-4 rounded-lg text-sm text-center ${
                  stageStatus.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/80 border border-red-500/50 text-red-200'
                }`}
              >
                {stageStatus.msg}
              </div>
            )}

            <form onSubmit={handleStageCalls} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-2">Target Advisor</label>
                <select
                  value={stageAdvisorId}
                  onChange={(e) => setStageAdvisorId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-sm"
                >
                  {advisors.length === 0 ? (
                    <option value="">No advisors available</option>
                  ) : (
                    advisors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name} (ID: {a.id})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-2">
                  Raw Calls (.mp3 / .wav / .m4a)
                </label>
                <div className="border-2 border-dashed border-white/20 hover:border-cyan-400/60 rounded-xl p-6 text-center bg-black/40 transition-colors">
                  <input
                    id="audio-file-input"
                    type="file"
                    multiple
                    accept=".mp3,.wav,.m4a"
                    onChange={(e) => setStageFiles(e.target.files)}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                  />
                  <p className="text-xs text-slate-400 mt-2">Maximum 200MB per audio file</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={stageSubmitting}
                className="mt-2 w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold tracking-wider uppercase text-sm shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {stageSubmitting ? 'Uploading & Triggering Pipeline...' : 'Stage Calls'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
