import React, { useEffect, useState, useCallback } from 'react';
import { Plus, AlertTriangle, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navigate } from '../hooks/useRoute';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDateTime, formatDate } from '../lib/utils';
import type { ContaminationReport, Batch } from '../lib/types';

const SUSPECTED_CAUSES = [
  'Bad agar', 'Bad LC', 'Bad spawn', 'Improper sterilization', 'Improper pasteurization',
  'Substrate too wet', 'Poor sealing', 'Dirty inoculation area', 'Worker handling issue',
  'Fruiting room contamination', 'Pest issue', 'Unknown',
];
const ACTIONS = [
  'Isolated', 'Discarded', 'Cleaned area', 'Retested source culture', 'Marked batch failed', 'Continued observation',
];

interface Props { batchId?: string; }

export default function ContaminationReports({ batchId }: Props) {
  const { user } = useAuth();
  const { canEdit } = usePermissions();
  const [reports, setReports] = useState<ContaminationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('contamination_reports')
      .select('*, batch:batches(batch_code, batch_type, species:species(name)), reporter:profiles(full_name)')
      .order('created_at', { ascending: false });
    if (batchId) q = q.eq('batch_id', batchId);
    if (filterStatus) q = q.eq('status', filterStatus);
    if (filterSeverity) q = q.eq('severity', filterSeverity);
    const { data } = await q.limit(100);
    setReports(data as ContaminationReport[] ?? []);
    setLoading(false);
  }, [batchId, filterStatus, filterSeverity]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contamination Reports</h1>
          <p className="text-sm text-gray-500">{reports.length} reports</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">
          <Plus size={16} /> Report Contamination
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All Status</option>
          {['Open', 'Reviewed', 'Resolved', 'Closed'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All Severity</option>
          {['Low', 'Medium', 'High', 'Critical'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : reports.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No contamination reports" description="Report contamination to track and investigate issues." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {reports.map(r => (
              <div key={r.id} className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${r.severity === 'Critical' ? 'bg-red-600' : r.severity === 'High' ? 'bg-red-400' : r.severity === 'Medium' ? 'bg-orange-400' : 'bg-amber-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => navigate('/batches/' + r.batch_id)} className="text-sm font-semibold text-gray-900 hover:text-emerald-600">
                      {(r as any).batch?.batch_code ?? 'Unknown batch'}
                    </button>
                    <StatusBadge label={r.severity} type="severity" />
                    <StatusBadge label={r.status} color={r.status === 'Open' ? 'bg-red-100 text-red-700' : r.status === 'Closed' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'} />
                  </div>
                  <p className="text-sm text-gray-600">
                    {r.affected_quantity} units · {r.suspected_cause ?? 'Unknown cause'} · {r.action_taken ?? 'No action'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Reported by {(r as any).reporter?.full_name ?? '—'} · {formatDate(r.observed_at)}
                    {(r as any).batch?.species?.name && ` · ${(r as any).batch.species.name}`}
                  </p>
                  {r.manager_note && <p className="text-xs text-blue-600 mt-1 italic">Manager note: {r.manager_note}</p>}
                </div>
                <div className="flex-shrink-0 flex gap-1">
                  {canEdit('contamination') && r.status === 'Open' && (
                    <ReviewButton reportId={r.id} onUpdated={fetchReports} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && <ContaminationCreateModal onClose={() => setShowCreate(false)} onCreated={fetchReports} initialBatchId={batchId} />}
    </div>
  );
}

function ReviewButton({ reportId, onUpdated }: { reportId: string; onUpdated: () => void }) {
  async function review() {
    await supabase.from('contamination_reports').update({ status: 'Reviewed', updated_at: new Date().toISOString() }).eq('id', reportId);
    onUpdated();
  }
  return (
    <button onClick={review} className="text-xs text-blue-600 hover:underline px-2 py-1 border border-blue-200 rounded">
      Mark Reviewed
    </button>
  );
}

function ContaminationCreateModal({ onClose, onCreated, initialBatchId }: { onClose: () => void; onCreated: () => void; initialBatchId?: string }) {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [form, setForm] = useState({
    batch_id: initialBatchId ?? '',
    stage: '',
    affected_quantity: '',
    severity: 'Medium',
    suspected_type: '',
    suspected_cause: 'Unknown',
    action_taken: 'Isolated',
    photo_url: '',
    manager_note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('batches').select('id, batch_code, batch_type').not('status', 'in', '("Closed","Discarded","Spent")').limit(100).then(({ data }) => setBatches(data as Batch[] ?? []));
  }, []);

  async function handleCreate() {
    if (!form.batch_id || !form.affected_quantity) { setError('Batch and affected quantity are required.'); return; }
    setLoading(true);
    setError('');
    try {
      const batch = batches.find(b => b.id === form.batch_id);
      const { error: err } = await supabase.from('contamination_reports').insert({
        batch_id: form.batch_id,
        batch_type: batch?.batch_type ?? null,
        stage: form.stage || null,
        affected_quantity: parseFloat(form.affected_quantity),
        severity: form.severity,
        suspected_type: form.suspected_type || null,
        suspected_cause: form.suspected_cause,
        action_taken: form.action_taken,
        photo_url: form.photo_url || null,
        manager_note: form.manager_note || null,
        reported_by: user?.id,
        status: 'Open',
      });
      if (err) { setError(err.message); return; }

      // Update batch health status
      await supabase.from('batches').update({ health_status: 'Contaminated', updated_at: new Date().toISOString() }).eq('id', form.batch_id);
      await supabase.from('batch_events').insert({
        batch_id: form.batch_id,
        event_type: 'contamination_reported',
        title: `Contamination reported: ${form.severity} severity`,
        description: `Cause: ${form.suspected_cause}. Action: ${form.action_taken}`,
        created_by: user?.id,
      });

      onCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Report Contamination" size="lg">
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">Contamination Report</p>
          <p className="text-xs text-red-600 mt-0.5">This will update the batch health status and notify the manager.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
            <select value={form.batch_id} onChange={e => setForm(f => ({ ...f, batch_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-400">
              <option value="">Select batch...</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Affected Quantity *</label>
            <input type="number" value={form.affected_quantity} onChange={e => setForm(f => ({ ...f, affected_quantity: e.target.value }))} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-400">
              {['Low', 'Medium', 'High', 'Critical'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Suspected Cause</label>
            <select value={form.suspected_cause} onChange={e => setForm(f => ({ ...f, suspected_cause: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-400">
              {SUSPECTED_CAUSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
            <select value={form.action_taken} onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-400">
              {ACTIONS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL (recommended)</label>
            <input value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="Paste photo URL as evidence..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg">
            {loading ? 'Reporting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
