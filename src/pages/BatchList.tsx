import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, ChevronRight, Layers, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navigate } from '../hooks/useRoute';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { formatDate, getBatchTypeLabel } from '../lib/utils';
import type { Batch, Species, Strain, Room, Profile } from '../lib/types';

const BATCH_TYPES = ['agar', 'liquid_culture', 'grain_spawn', 'substrate', 'fruiting_block', 'harvest', 'other'];
const STATUSES = ['Planned', 'Prepared', 'Inoculated', 'Incubating', 'Colonized', 'Fruiting', 'Pinning', 'Ready to Harvest', 'Contaminated', 'Discarded', 'Closed', 'Spent'];

interface Filters {
  search: string;
  type: string;
  status: string;
  health: string;
  species: string;
}

interface Props {
  initialType?: string;
}

export default function BatchList({ initialType = '' }: Props) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ search: '', type: initialType, status: '', health: '', species: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    supabase.from('species').select('*').eq('is_active', true).then(({ data }) => setSpeciesList(data ?? []));
  }, []);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('batches')
        .select('*, species:species(name), strain:strains(strain_name, strain_code), room:rooms(name)')
        .order('created_at', { ascending: false });

      if (filters.type) q = q.eq('batch_type', filters.type);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.health) q = q.eq('health_status', filters.health);
      if (filters.species) q = q.eq('species_id', filters.species);
      if (filters.search) q = q.ilike('batch_code', `%${filters.search}%`);

      const { data } = await q.limit(100);
      setBatches(data as Batch[] ?? []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  useEffect(() => {
    setFilters(f => ({ ...f, type: initialType }));
  }, [initialType]);

  function clearFilters() {
    setFilters({ search: '', type: initialType, status: '', health: '', species: '' });
  }

  const hasActiveFilters = filters.status || filters.health || filters.species || (filters.type !== initialType);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {filters.type ? getBatchTypeLabel(filters.type) : 'All Batches'}
          </h1>
          <p className="text-sm text-gray-500">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Batch
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search batch code..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters(p => !p)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters || hasActiveFilters ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          <Filter size={15} />
          Filter
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Batch Type</label>
            <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">All Types</option>
              {BATCH_TYPES.map(t => <option key={t} value={t}>{getBatchTypeLabel(t)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Health</label>
            <select value={filters.health} onChange={e => setFilters(f => ({ ...f, health: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">All Health</option>
              {['Healthy', 'Needs Inspection', 'Delayed', 'Partially Contaminated', 'Contaminated'].map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Species</label>
            <select value={filters.species} onChange={e => setFilters(f => ({ ...f, species: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">All Species</option>
              {speciesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="col-span-full flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600">
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      )}

      {loading ? <PageLoader /> : batches.length === 0 ? (
        <EmptyState icon={Layers} title="No batches found" description="Create your first production batch to get started." action={
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">New Batch</button>
        } />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Species</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Health</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Qty</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Location</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Started</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {batches.map(batch => (
                  <tr
                    key={batch.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate('/batches/' + batch.id)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">{batch.batch_code}</span>
                      {batch.strain && <p className="text-xs text-gray-400">{(batch as any).strain.strain_code}</p>}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{getBatchTypeLabel(batch.batch_type)}</td>
                    <td className="px-3 py-3 text-gray-600">{(batch as any).species?.name ?? '—'}</td>
                    <td className="px-3 py-3"><StatusBadge label={batch.status} /></td>
                    <td className="px-3 py-3"><StatusBadge label={batch.health_status} type="health" /></td>
                    <td className="px-3 py-3 text-gray-600 hidden lg:table-cell">{batch.quantity} {batch.unit}</td>
                    <td className="px-3 py-3 text-gray-500 hidden lg:table-cell">{(batch as any).room?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-400 hidden lg:table-cell">{formatDate(batch.start_date)}</td>
                    <td className="px-3 py-3"><ChevronRight size={14} className="text-gray-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <BatchCreateModal defaultType={filters.type} onClose={() => setShowCreate(false)} onCreated={fetchBatches} />}
    </div>
  );
}

const UNIT_DEFAULTS: Record<string, string> = {
  agar: 'plates',
  liquid_culture: 'bottles',
  grain_spawn: 'jars',
  substrate: 'bags',
  fruiting_block: 'blocks',
  harvest: 'kg',
  other: 'units',
};

function BatchCreateModal({ defaultType, onClose, onCreated }: { defaultType?: string; onClose: () => void; onCreated: () => void }) {
  const initialType = defaultType && BATCH_TYPES.includes(defaultType) ? defaultType : 'agar';
  const [form, setForm] = useState({
    batch_type: initialType,
    species_id: '',
    strain_id: '',
    recipe_id: '',
    quantity: '',
    unit: UNIT_DEFAULTS[initialType] ?? 'units',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
    room_id: '',
    template_id: '',
  });
  const [species, setSpecies] = useState<Species[]>([]);
  const [strains, setStrains] = useState<Strain[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('species').select('*').eq('is_active', true),
      supabase.from('rooms').select('*').eq('is_active', true),
      supabase.from('process_templates').select('*').eq('is_active', true),
    ]).then(([s, r, t]) => {
      setSpecies(s.data ?? []);
      setRooms(r.data ?? []);
      setTemplates(t.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!form.species_id) { setStrains([]); return; }
    supabase.from('strains').select('*').eq('species_id', form.species_id).eq('is_active', true)
      .then(({ data }) => setStrains(data ?? []));
  }, [form.species_id]);

  async function handleCreate() {
    if (!form.batch_type || !form.quantity) { setError('Batch type and quantity are required'); return; }
    setLoading(true);
    setError('');
    try {
      const seq = Math.floor(Math.random() * 9000) + 1000;
      const prefix = { agar: 'AP', liquid_culture: 'LC', grain_spawn: 'GS', substrate: 'SB', fruiting_block: 'FB', harvest: 'HV', other: 'OT' }[form.batch_type] ?? 'XX';
      const batch_code = `${prefix}-${seq}`;

      const { data: batch, error: err } = await supabase.from('batches').insert({
        batch_code,
        batch_type: form.batch_type,
        species_id: form.species_id || null,
        strain_id: form.strain_id || null,
        recipe_id: form.recipe_id || null,
        quantity: parseFloat(form.quantity) || 0,
        unit: form.unit,
        start_date: form.start_date,
        notes: form.notes || null,
        room_id: form.room_id || null,
        status: 'Planned',
        health_status: 'Healthy',
      }).select().single();

      if (err) { setError(err.message); return; }

      // Auto-generate tasks from template
      if (form.template_id && batch) {
        const { data: steps } = await supabase.from('process_template_steps')
          .select('*').eq('template_id', form.template_id).order('step_order');
        if (steps && steps.length > 0) {
          const startDate = new Date(form.start_date);
          const taskInserts = steps.map(step => ({
            title: step.title,
            description: step.description,
            batch_id: batch.id,
            due_at: new Date(startDate.getTime() + step.day_offset * 24 * 60 * 60 * 1000).toISOString(),
            priority: step.priority,
            photo_required: step.photo_required,
            approval_required: step.approval_required,
            assigned_role: step.assigned_role,
            department: step.assigned_department,
            status: 'Pending',
          }));
          await supabase.from('tasks').insert(taskInserts);
        }
      }

      // Create batch event
      await supabase.from('batch_events').insert({
        batch_id: batch.id,
        event_type: 'created',
        title: 'Batch Created',
        description: `Batch ${batch_code} created with ${form.quantity} ${form.unit}`,
      });

      onCreated();
      navigate('/batches/' + batch.id);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const filteredTemplates = templates.filter(t => !t.batch_type || t.batch_type === form.batch_type);

  return (
    <Modal open onClose={onClose} title="Create New Batch" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Type *</label>
            <select value={form.batch_type} onChange={e => setForm(f => ({ ...f, batch_type: e.target.value, template_id: '', unit: UNIT_DEFAULTS[e.target.value] ?? 'units' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
              {BATCH_TYPES.map(t => <option key={t} value={t}>{getBatchTypeLabel(t)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
            <select value={form.species_id} onChange={e => setForm(f => ({ ...f, species_id: e.target.value, strain_id: '' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="">Select species...</option>
              {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strain</label>
            <select value={form.strain_id} onChange={e => setForm(f => ({ ...f, strain_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none" disabled={!form.species_id}>
              <option value="">Select strain...</option>
              {strains.map(s => <option key={s.id} value={s.id}>{s.strain_code} {s.strain_name ? `— ${s.strain_name}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room / Location</label>
            <select value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="">Select room...</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
              {['blocks', 'bags', 'jars', 'plates', 'bottles', 'units', 'kg'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Process Template</label>
            <select value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="">No template</option>
              {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors">
            {loading ? 'Creating…' : 'Create Batch'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
