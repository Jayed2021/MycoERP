import React, { useEffect, useState } from 'react';
import { Plus, Edit2, BookOpen, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { getBatchTypeLabel } from '../lib/utils';
import type { ProcessTemplate, ProcessTemplateStep, Species } from '../lib/types';

const BATCH_TYPES = ['agar', 'liquid_culture', 'grain_spawn', 'substrate', 'fruiting_block', 'harvest', 'other'];
const ROLES = ['admin', 'manager', 'lab_worker', 'production_worker', 'harvest_worker'];
const DEPTS = ['Lab', 'Spawn', 'Substrate', 'Incubation', 'Fruiting', 'Harvest', 'Packaging', 'Management'];

export default function ProcessTemplates() {
  const { user } = useAuth();
  const { canEdit } = usePermissions();
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [steps, setSteps] = useState<Record<string, ProcessTemplateStep[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState<string | null>(null);
  const [editTemplate, setEditTemplate] = useState<ProcessTemplate | null>(null);
  const [editStep, setEditStep] = useState<ProcessTemplateStep | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [tmplRes, stepsRes, spRes] = await Promise.all([
      supabase.from('process_templates').select('*, species:species(name)').order('name'),
      supabase.from('process_template_steps').select('*').order('step_order'),
      supabase.from('species').select('*').eq('is_active', true),
    ]);
    setTemplates(tmplRes.data ?? []);
    const grouped: Record<string, ProcessTemplateStep[]> = {};
    for (const s of stepsRes.data ?? []) {
      if (!grouped[s.template_id]) grouped[s.template_id] = [];
      grouped[s.template_id].push(s);
    }
    setSteps(grouped);
    setSpecies(spRes.data ?? []);
    setLoading(false);
  }

  async function deleteStep(stepId: string) {
    await supabase.from('process_template_steps').delete().eq('id', stepId);
    fetchAll();
  }

  function toggle(id: string) {
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SOP Templates</h1>
          <p className="text-sm text-gray-500">{templates.length} templates · Auto-generate tasks for batches</p>
        </div>
        {canEdit('process_templates') && (
          <button onClick={() => { setEditTemplate(null); setShowTemplateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
            <Plus size={16} /> New Template
          </button>
        )}
      </div>

      {templates.length === 0 ? (
        <EmptyState icon={BookOpen} title="No templates defined" description="Create process templates to auto-generate tasks for batches." />
      ) : (
        <div className="space-y-3">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50" onClick={() => toggle(tmpl.id)}>
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">{tmpl.name}</h2>
                    <StatusBadge label={getBatchTypeLabel(tmpl.batch_type)} color="bg-blue-50 text-blue-700" />
                    <StatusBadge label={tmpl.is_active ? 'Active' : 'Inactive'} color={tmpl.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} />
                  </div>
                  {(tmpl as any).species?.name && <p className="text-xs text-gray-400">{(tmpl as any).species.name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{steps[tmpl.id]?.length ?? 0} steps</span>
                  {canEdit('process_templates') && (
                    <>
                      <button onClick={e => { e.stopPropagation(); setShowStepModal(tmpl.id); setEditStep(null); }}
                        className="px-2 py-1 text-xs text-emerald-600 font-medium hover:bg-emerald-50 rounded">+ Step</button>
                      <button onClick={e => { e.stopPropagation(); setEditTemplate(tmpl); setShowTemplateModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100">
                        <Edit2 size={13} className="text-gray-400" />
                      </button>
                    </>
                  )}
                  {expanded.has(tmpl.id) ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {expanded.has(tmpl.id) && (
                <div className="border-t border-gray-100">
                  {tmpl.description && <p className="text-sm text-gray-600 px-5 py-3 bg-gray-50/50">{tmpl.description}</p>}
                  {(steps[tmpl.id] ?? []).length === 0 ? (
                    <p className="text-sm text-gray-400 px-5 py-3">No steps defined.</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {steps[tmpl.id].map((step, i) => (
                        <div key={step.id} className="flex items-start gap-3 px-5 py-3">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{step.title}</span>
                              <span className="text-xs text-gray-400">Day {step.day_offset}</span>
                              <StatusBadge label={step.priority} type="priority" />
                              {step.photo_required && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">📷 Photo</span>}
                              {step.approval_required && <span className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">✓ Approval</span>}
                            </div>
                            {step.description && <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>}
                            <p className="text-xs text-gray-400 mt-0.5">{step.assigned_role ?? ''}{step.assigned_department ? ` · ${step.assigned_department}` : ''}</p>
                          </div>
                          {canEdit('process_templates') && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => { setEditStep(step); setShowStepModal(tmpl.id); }}
                                className="p-1 rounded hover:bg-gray-100"><Edit2 size={12} className="text-gray-400" /></button>
                              <button onClick={() => deleteStep(step.id)}
                                className="p-1 rounded hover:bg-red-50"><Trash2 size={12} className="text-red-400" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showTemplateModal && (
        <TemplateModal template={editTemplate} species={species} onClose={() => setShowTemplateModal(false)} onSaved={fetchAll} />
      )}
      {showStepModal && (
        <StepModal templateId={showStepModal} step={editStep} stepCount={steps[showStepModal]?.length ?? 0} onClose={() => setShowStepModal(null)} onSaved={fetchAll} />
      )}
    </div>
  );
}

function TemplateModal({ template, species, onClose, onSaved }: { template: ProcessTemplate | null; species: Species[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: template?.name ?? '',
    batch_type: template?.batch_type ?? 'fruiting_block',
    species_id: template?.species_id ?? '',
    description: template?.description ?? '',
    is_active: template?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!form.name) return;
    setLoading(true);
    const data = { ...form, species_id: form.species_id || null };
    if (template) {
      await supabase.from('process_templates').update({ ...data, updated_at: new Date().toISOString() }).eq('id', template.id);
    } else {
      await supabase.from('process_templates').insert(data);
    }
    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={template ? 'Edit Template' : 'New Template'}>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Batch Type</label>
          <select value={form.batch_type} onChange={e => setForm(f => ({ ...f, batch_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
            {BATCH_TYPES.map(t => <option key={t} value={t}>{getBatchTypeLabel(t)}</option>)}
          </select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Species (optional)</label>
          <select value={form.species_id} onChange={e => setForm(f => ({ ...f, species_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">All species</option>
            {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={loading || !form.name} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  );
}

function StepModal({ templateId, step, stepCount, onClose, onSaved }: { templateId: string; step: ProcessTemplateStep | null; stepCount: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: step?.title ?? '',
    description: step?.description ?? '',
    day_offset: step?.day_offset ?? 0,
    due_time: step?.due_time ?? '',
    assigned_role: step?.assigned_role ?? '',
    assigned_department: step?.assigned_department ?? '',
    priority: step?.priority ?? 'Normal',
    photo_required: step?.photo_required ?? false,
    approval_required: step?.approval_required ?? false,
    target_stage: step?.target_stage ?? '',
    target_status: step?.target_status ?? '',
    step_order: step?.step_order ?? stepCount + 1,
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!form.title) return;
    setLoading(true);
    const data = { ...form, template_id: templateId, assigned_role: form.assigned_role || null, assigned_department: form.assigned_department || null, due_time: form.due_time || null, target_stage: form.target_stage || null, target_status: form.target_status || null };
    if (step) {
      await supabase.from('process_template_steps').update(data).eq('id', step.id);
    } else {
      await supabase.from('process_template_steps').insert(data);
    }
    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={step ? 'Edit Step' : 'New Step'} size="lg">
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Step Title *</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Day Offset</label>
            <input type="number" value={form.day_offset} onChange={e => setForm(f => ({ ...f, day_offset: +e.target.value }))} min={0} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              {['Low', 'Normal', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Assigned Role</label>
            <select value={form.assigned_role} onChange={e => setForm(f => ({ ...f, assigned_role: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Any</option>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select value={form.assigned_department} onChange={e => setForm(f => ({ ...f, assigned_department: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Any</option>
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select></div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.photo_required} onChange={e => setForm(f => ({ ...f, photo_required: e.target.checked }))} className="rounded" /> Photo required</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.approval_required} onChange={e => setForm(f => ({ ...f, approval_required: e.target.checked }))} className="rounded" /> Approval required</label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={loading || !form.title} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  );
}
