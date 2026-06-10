import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Leaf, ChevronDown, ChevronUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDate, canManage } from '../lib/utils';
import type { Species, Strain } from '../lib/types';

export default function SpeciesStrains() {
  const { user } = useAuth();
  const [species, setSpecies] = useState<Species[]>([]);
  const [strains, setStrains] = useState<Record<string, Strain[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedSpecies, setExpandedSpecies] = useState<Set<string>>(new Set());
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [showStrainModal, setShowStrainModal] = useState<string | null>(null);
  const [editSpecies, setEditSpecies] = useState<Species | null>(null);
  const [editStrain, setEditStrain] = useState<Strain | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [speciesRes, strainsRes] = await Promise.all([
      supabase.from('species').select('*').order('name'),
      supabase.from('strains').select('*, species:species(name)').order('strain_code'),
    ]);
    setSpecies(speciesRes.data ?? []);
    const grouped: Record<string, Strain[]> = {};
    for (const s of strainsRes.data ?? []) {
      if (!grouped[s.species_id!]) grouped[s.species_id!] = [];
      grouped[s.species_id!].push(s);
    }
    setStrains(grouped);
    setLoading(false);
  }

  function toggleExpand(id: string) {
    setExpandedSpecies(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Species & Strains</h1>
          <p className="text-sm text-gray-500">{species.length} species</p>
        </div>
        {canManage(user?.role ?? '') && (
          <button onClick={() => { setEditSpecies(null); setShowSpeciesModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
            <Plus size={16} /> New Species
          </button>
        )}
      </div>

      {species.length === 0 ? (
        <EmptyState icon={Leaf} title="No species defined" description="Add mushroom species to get started." />
      ) : (
        <div className="space-y-3">
          {species.map(sp => (
            <div key={sp.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(sp.id)}>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Leaf size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">{sp.name}</h2>
                    <StatusBadge label={sp.is_active ? 'Active' : 'Inactive'} color={sp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} />
                  </div>
                  {sp.scientific_name && <p className="text-xs text-gray-400 italic">{sp.scientific_name}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{strains[sp.id]?.length ?? 0} strain{(strains[sp.id]?.length ?? 0) !== 1 ? 's' : ''}</span>
                  <div className="flex gap-1">
                    {canManage(user?.role ?? '') && (
                      <>
                        <button onClick={e => { e.stopPropagation(); setShowStrainModal(sp.id); setEditStrain(null); }}
                          className="p-1.5 rounded-lg text-xs text-emerald-600 hover:bg-emerald-50 font-medium">+ Strain</button>
                        <button onClick={e => { e.stopPropagation(); setEditSpecies(sp); setShowSpeciesModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-gray-100">
                          <Edit2 size={13} className="text-gray-400" />
                        </button>
                      </>
                    )}
                    {expandedSpecies.has(sp.id) ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
              </div>

              {expandedSpecies.has(sp.id) && (
                <div className="border-t border-gray-100">
                  {sp.description && (
                    <p className="text-sm text-gray-600 px-5 py-3 bg-gray-50/50">{sp.description}</p>
                  )}
                  <div className="grid grid-cols-3 gap-4 px-5 py-3 text-sm border-b border-gray-50">
                    <div><span className="text-gray-400 text-xs">Incubation</span><p className="font-medium">{sp.default_incubation_days ?? '—'} days</p></div>
                    <div><span className="text-gray-400 text-xs">Fruiting</span><p className="font-medium">{sp.default_fruiting_days ?? '—'} days</p></div>
                    <div><span className="text-gray-400 text-xs">Harvest Window</span><p className="font-medium">{sp.default_harvest_window_days ?? '—'} days</p></div>
                  </div>
                  {(strains[sp.id] ?? []).length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {strains[sp.id].map(strain => (
                        <div key={strain.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{strain.strain_code}</span>
                              {strain.strain_name && <span className="text-sm text-gray-500">— {strain.strain_name}</span>}
                              <StatusBadge label={strain.is_active ? 'Active' : 'Inactive'} color={strain.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} />
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                              {strain.source && <span>Source: {strain.source}</span>}
                              {strain.date_acquired && <span>Acquired: {formatDate(strain.date_acquired)}</span>}
                              {strain.expected_colonization_days && <span>Col: {strain.expected_colonization_days}d</span>}
                              {strain.expected_fruiting_days && <span>Fruit: {strain.expected_fruiting_days}d</span>}
                            </div>
                          </div>
                          {canManage(user?.role ?? '') && (
                            <button onClick={() => { setEditStrain(strain); setShowStrainModal(sp.id); }}
                              className="p-1.5 rounded-lg hover:bg-gray-100">
                              <Edit2 size={13} className="text-gray-400" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 px-5 py-3">No strains added yet.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showSpeciesModal && (
        <SpeciesModal
          species={editSpecies}
          onClose={() => setShowSpeciesModal(false)}
          onSaved={fetchAll}
        />
      )}
      {showStrainModal && (
        <StrainModal
          speciesId={showStrainModal}
          strain={editStrain}
          onClose={() => setShowStrainModal(null)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}

function SpeciesModal({ species, onClose, onSaved }: { species: Species | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: species?.name ?? '',
    scientific_name: species?.scientific_name ?? '',
    description: species?.description ?? '',
    default_incubation_days: species?.default_incubation_days ?? 14,
    default_fruiting_days: species?.default_fruiting_days ?? 14,
    default_harvest_window_days: species?.default_harvest_window_days ?? 7,
    is_active: species?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!form.name) return;
    setLoading(true);
    if (species) {
      await supabase.from('species').update({ ...form, updated_at: new Date().toISOString() }).eq('id', species.id);
    } else {
      await supabase.from('species').insert(form);
    }
    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={species ? 'Edit Species' : 'New Species'}>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Scientific Name</label>
          <input value={form.scientific_name} onChange={e => setForm(f => ({ ...f, scientific_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Incubation days</label>
            <input type="number" value={form.default_incubation_days} onChange={e => setForm(f => ({ ...f, default_incubation_days: +e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Fruiting days</label>
            <input type="number" value={form.default_fruiting_days} onChange={e => setForm(f => ({ ...f, default_fruiting_days: +e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Harvest window</label>
            <input type="number" value={form.default_harvest_window_days} onChange={e => setForm(f => ({ ...f, default_harvest_window_days: +e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={loading || !form.name} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  );
}

function StrainModal({ speciesId, strain, onClose, onSaved }: { speciesId: string; strain: Strain | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    strain_code: strain?.strain_code ?? '',
    strain_name: strain?.strain_name ?? '',
    source: strain?.source ?? '',
    date_acquired: strain?.date_acquired ?? '',
    storage_method: strain?.storage_method ?? '',
    expected_colonization_days: strain?.expected_colonization_days ?? '',
    expected_fruiting_days: strain?.expected_fruiting_days ?? '',
    expected_yield_notes: strain?.expected_yield_notes ?? '',
    notes: strain?.notes ?? '',
    is_active: strain?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!form.strain_code) return;
    setLoading(true);
    const data = {
      ...form,
      species_id: speciesId,
      expected_colonization_days: form.expected_colonization_days ? +form.expected_colonization_days : null,
      expected_fruiting_days: form.expected_fruiting_days ? +form.expected_fruiting_days : null,
      date_acquired: form.date_acquired || null,
    };
    if (strain) {
      await supabase.from('strains').update({ ...data, updated_at: new Date().toISOString() }).eq('id', strain.id);
    } else {
      await supabase.from('strains').insert(data);
    }
    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={strain ? 'Edit Strain' : 'New Strain'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Strain Code *</label>
            <input value={form.strain_code} onChange={e => setForm(f => ({ ...f, strain_code: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Strain Name</label>
            <input value={form.strain_name} onChange={e => setForm(f => ({ ...f, strain_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Date Acquired</label>
            <input type="date" value={form.date_acquired} onChange={e => setForm(f => ({ ...f, date_acquired: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Colonization Days</label>
            <input type="number" value={form.expected_colonization_days} onChange={e => setForm(f => ({ ...f, expected_colonization_days: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Fruiting Days</label>
            <input type="number" value={form.expected_fruiting_days} onChange={e => setForm(f => ({ ...f, expected_fruiting_days: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Storage Method</label>
          <input value={form.storage_method} onChange={e => setForm(f => ({ ...f, storage_method: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Yield Notes</label>
          <input value={form.expected_yield_notes} onChange={e => setForm(f => ({ ...f, expected_yield_notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={loading || !form.strain_code} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  );
}
