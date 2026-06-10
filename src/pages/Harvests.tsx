import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Scissors, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navigate } from '../hooks/useRoute';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDateTime, formatDate } from '../lib/utils';
import type { Harvest, Batch, Species, Strain, Profile } from '../lib/types';

export default function Harvests({ batchId }: { batchId?: string }) {
  const { user } = useAuth();
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchHarvests = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('harvests')
      .select('*, batch:batches(batch_code), species:species(name), strain:strains(strain_code), harvester:profiles(full_name)')
      .order('harvested_at', { ascending: false });
    if (batchId) q = q.eq('fruiting_batch_id', batchId);
    const { data } = await q.limit(100);
    setHarvests(data as Harvest[] ?? []);
    setLoading(false);
  }, [batchId]);

  useEffect(() => { fetchHarvests(); }, [fetchHarvests]);

  const totalGradeA = harvests.reduce((s, h) => s + h.grade_a_weight, 0);
  const totalGradeB = harvests.reduce((s, h) => s + h.grade_b_weight, 0);
  const totalWaste = harvests.reduce((s, h) => s + h.waste_weight, 0);
  const totalNet = totalGradeA + totalGradeB;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Harvest Records</h1>
          <p className="text-sm text-gray-500">{harvests.length} harvests recorded</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
          <Plus size={16} /> Record Harvest
        </button>
      </div>

      {harvests.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="Total Net (kg)" value={totalNet.toFixed(2)} color="text-emerald-700" />
          <SummaryCard label="Grade A (kg)" value={totalGradeA.toFixed(2)} color="text-emerald-600" />
          <SummaryCard label="Grade B (kg)" value={totalGradeB.toFixed(2)} color="text-amber-600" />
          <SummaryCard label="Waste (kg)" value={totalWaste.toFixed(2)} color="text-red-500" />
        </div>
      )}

      {loading ? <PageLoader /> : harvests.length === 0 ? (
        <EmptyState icon={Scissors} title="No harvest records" description="Record a harvest to track your production output." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Code</th>
                  <th className="text-left px-3 py-3">Batch</th>
                  <th className="text-left px-3 py-3">Species</th>
                  <th className="text-center px-3 py-3">Flush</th>
                  <th className="text-right px-3 py-3">Gross</th>
                  <th className="text-right px-3 py-3">Grade A</th>
                  <th className="text-right px-3 py-3">Grade B</th>
                  <th className="text-right px-3 py-3">Waste</th>
                  <th className="text-left px-3 py-3">Date</th>
                  <th className="text-left px-3 py-3 hidden lg:table-cell">Harvested By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {harvests.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-900">{h.harvest_code}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => navigate('/batches/' + h.fruiting_batch_id)} className="text-emerald-600 hover:underline">
                        {(h as any).batch?.batch_code ?? '—'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{(h as any).species?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-700 font-medium">#{h.flush_number}</span></td>
                    <td className="px-3 py-3 text-right font-medium">{h.gross_weight.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-emerald-700">{h.grade_a_weight.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-amber-700">{h.grade_b_weight.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-gray-400">{h.waste_weight.toFixed(2)}</td>
                    <td className="px-3 py-3 text-gray-500">{formatDate(h.harvested_at)}</td>
                    <td className="px-3 py-3 text-gray-500 hidden lg:table-cell">{(h as any).harvester?.full_name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <HarvestCreateModal onClose={() => setShowCreate(false)} onCreated={fetchHarvests} initialBatchId={batchId} />}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function HarvestCreateModal({ onClose, onCreated, initialBatchId }: { onClose: () => void; onCreated: () => void; initialBatchId?: string }) {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [form, setForm] = useState({
    fruiting_batch_id: initialBatchId ?? '',
    species_id: '',
    strain_id: '',
    flush_number: '1',
    harvested_at: new Date().toISOString().slice(0, 16),
    gross_weight: '',
    grade_a_weight: '',
    grade_b_weight: '',
    waste_weight: '',
    notes: '',
    photo_url: '',
  });
  const [strains, setStrains] = useState<Strain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('batches').select('id, batch_code, species_id, strain_id').in('batch_type', ['fruiting_block']).not('status', 'in', '("Closed","Discarded","Spent")').limit(100),
      supabase.from('species').select('*').eq('is_active', true),
    ]).then(([b, s]) => {
      setBatches(b.data as Batch[] ?? []);
      setSpecies(s.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!form.species_id) { setStrains([]); return; }
    supabase.from('strains').select('*').eq('species_id', form.species_id).eq('is_active', true).then(({ data }) => setStrains(data ?? []));
  }, [form.species_id]);

  // Auto-fill species/strain from selected batch
  useEffect(() => {
    if (!form.fruiting_batch_id) return;
    const batch = batches.find(b => b.id === form.fruiting_batch_id);
    if (batch) {
      setForm(f => ({ ...f, species_id: batch.species_id ?? '', strain_id: batch.strain_id ?? '' }));
    }
  }, [form.fruiting_batch_id, batches]);

  async function handleCreate() {
    if (!form.fruiting_batch_id || !form.gross_weight) { setError('Batch and gross weight are required.'); return; }
    setLoading(true);
    setError('');
    try {
      const seq = Math.floor(Math.random() * 90000) + 10000;
      const harvest_code = `HV-${seq}`;
      const { error: err } = await supabase.from('harvests').insert({
        harvest_code,
        fruiting_batch_id: form.fruiting_batch_id,
        species_id: form.species_id || null,
        strain_id: form.strain_id || null,
        flush_number: parseInt(form.flush_number) || 1,
        harvested_at: form.harvested_at,
        gross_weight: parseFloat(form.gross_weight) || 0,
        grade_a_weight: parseFloat(form.grade_a_weight) || 0,
        grade_b_weight: parseFloat(form.grade_b_weight) || 0,
        waste_weight: parseFloat(form.waste_weight) || 0,
        harvested_by: user?.id,
        notes: form.notes || null,
        photo_url: form.photo_url || null,
      });
      if (err) { setError(err.message); return; }

      await supabase.from('batch_events').insert({
        batch_id: form.fruiting_batch_id,
        event_type: 'harvest_recorded',
        title: `Flush ${form.flush_number} harvest recorded: ${form.gross_weight}kg gross`,
        created_by: user?.id,
      });
      await supabase.from('batches').update({ status: `Harvested Flush ${form.flush_number}`, updated_at: new Date().toISOString() }).eq('id', form.fruiting_batch_id);

      onCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Record Harvest" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fruiting Batch *</label>
            <select value={form.fruiting_batch_id} onChange={e => setForm(f => ({ ...f, fruiting_batch_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Select batch...</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
            <select value={form.species_id} onChange={e => setForm(f => ({ ...f, species_id: e.target.value, strain_id: '' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Select species...</option>
              {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flush Number</label>
            <input type="number" min="1" value={form.flush_number} onChange={e => setForm(f => ({ ...f, flush_number: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Harvest Date/Time</label>
            <input type="datetime-local" value={form.harvested_at} onChange={e => setForm(f => ({ ...f, harvested_at: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          {[
            { key: 'gross_weight', label: 'Gross Weight (kg) *' },
            { key: 'grade_a_weight', label: 'Grade A (kg)' },
            { key: 'grade_b_weight', label: 'Grade B (kg)' },
            { key: 'waste_weight', label: 'Waste (kg)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type="number" min="0" step="0.01" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL (optional)</label>
            <input value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">
            {loading ? 'Recording…' : 'Record Harvest'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
