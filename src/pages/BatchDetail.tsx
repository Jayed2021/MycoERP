import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Edit2, Plus, AlertTriangle, Scissors, ChevronRight,
  Clock, User, MapPin, Tag, Calendar, ClipboardList, GitBranch,
  Image, FileText, Activity, CheckCircle2, Leaf, QrCode, ScanLine, Printer,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navigate } from '../hooks/useRoute';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { PageLoader } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { QrCodeDisplay } from '../components/QrCodeDisplay';
import { formatDateTime, formatDate, getBatchTypeLabel, generateQrText, formatRelativeTime } from '../lib/utils';
import { usePermissions } from '../contexts/PermissionsContext';
import type { Batch, Task, BatchEvent, BatchNote, ContaminationReport, Harvest, QrCode as QrCodeType } from '../lib/types';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'genealogy', label: 'Genealogy' },
  { key: 'contamination', label: 'Contamination' },
  { key: 'harvest', label: 'Harvest' },
  { key: 'notes', label: 'Notes' },
  { key: 'qr', label: 'QR Codes' },
];

const BATCH_STATUSES = [
  'Planned', 'Prepared', 'Inoculated', 'Incubating', 'Needs Inspection',
  'Colonized', 'Ready', 'Moved to Fruiting', 'Fruiting', 'Pinning',
  'Ready to Harvest', 'Harvested Flush 1', 'Resting', 'Flush 2', 'Spent',
  'Contaminated', 'Discarded', 'Closed',
];

const HEALTH_STATUSES = ['Healthy', 'Needs Inspection', 'Delayed', 'Partially Contaminated', 'Contaminated', 'Discarded', 'Closed'];

interface Props { batchId: string; }

export default function BatchDetail({ batchId }: Props) {
  const { user } = useAuth();
  const { canEdit } = usePermissions();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<BatchEvent[]>([]);
  const [notes, setNotes] = useState<BatchNote[]>([]);
  const [contamination, setContamination] = useState<ContaminationReport[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<QrCodeType[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showEditStatus, setShowEditStatus] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newHealth, setNewHealth] = useState('');

  useEffect(() => { fetchAll(); }, [batchId]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [batchRes, tasksRes, eventsRes, notesRes, contRes, harvestRes, sourcesRes, childrenRes, qrRes] = await Promise.all([
        supabase.from('batches').select('*, species:species(name), strain:strains(strain_code, strain_name), room:rooms(name), responsible_user:profiles!batches_responsible_user_id_fkey(full_name)').eq('id', batchId).single(),
        supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(full_name)').eq('batch_id', batchId).order('due_at'),
        supabase.from('batch_events').select('*, creator:profiles(full_name)').eq('batch_id', batchId).order('created_at', { ascending: false }),
        supabase.from('batch_notes').select('*, creator:profiles(full_name)').eq('batch_id', batchId).order('created_at', { ascending: false }),
        supabase.from('contamination_reports').select('*, reporter:profiles(full_name)').eq('batch_id', batchId).order('created_at', { ascending: false }),
        supabase.from('harvests').select('*, harvester:profiles(full_name)').eq('fruiting_batch_id', batchId).order('flush_number'),
        supabase.from('batch_sources').select('*, source_batch:batches!batch_sources_source_batch_id_fkey(batch_code, batch_type, status)').eq('child_batch_id', batchId),
        supabase.from('batch_sources').select('*, child_batch:batches!batch_sources_child_batch_id_fkey(batch_code, batch_type, status)').eq('source_batch_id', batchId),
        supabase.from('qr_codes').select('*').eq('entity_type', 'batch').eq('entity_id', batchId).order('created_at', { ascending: false }),
      ]);
      setBatch(batchRes.data as Batch);
      setTasks(tasksRes.data as Task[] ?? []);
      setEvents(eventsRes.data as BatchEvent[] ?? []);
      setNotes(notesRes.data as BatchNote[] ?? []);
      setContamination(contRes.data as ContaminationReport[] ?? []);
      setHarvests(harvestRes.data as Harvest[] ?? []);
      setSources(sourcesRes.data ?? []);
      setChildren(childrenRes.data ?? []);
      setQrCodes(qrRes.data as QrCodeType[] ?? []);
      setNewStatus(batchRes.data?.status ?? '');
      setNewHealth(batchRes.data?.health_status ?? '');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus() {
    if (!batch) return;
    await supabase.from('batches').update({ status: newStatus, health_status: newHealth, updated_at: new Date().toISOString() }).eq('id', batchId);
    await supabase.from('batch_events').insert({ batch_id: batchId, event_type: 'status_change', title: `Status updated to ${newStatus}`, description: `Health: ${newHealth}` });
    setShowEditStatus(false);
    fetchAll();
  }

  async function addNote() {
    if (!noteText.trim() || !user) return;
    await supabase.from('batch_notes').insert({ batch_id: batchId, note: noteText, created_by: user.id });
    await supabase.from('batch_events').insert({ batch_id: batchId, event_type: 'note_added', title: 'Note Added', description: noteText.slice(0, 100), created_by: user.id });
    setNoteText('');
    setShowAddNote(false);
    fetchAll();
  }

  async function generateBatchQr() {
    if (!batch || !user) return;
    const qrText = generateQrText('batch', batch.batch_code);
    await supabase.from('qr_codes').insert({
      qr_text: qrText,
      entity_type: 'batch',
      entity_id: batchId,
      label: batch.batch_code,
      description: `${getBatchTypeLabel(batch.batch_type)} — ${(batch as any).species?.name ?? ''}`,
      status: 'Active',
      created_by: user.id,
    });
    fetchAll();
  }

  if (loading) return <PageLoader />;
  if (!batch) return <div className="p-6 text-gray-500">Batch not found.</div>;

  const totalHarvest = harvests.reduce((s, h) => s + h.grade_a_weight + h.grade_b_weight, 0);
  const pendingTasks = tasks.filter(t => !['Completed', 'Approved', 'Cancelled'].includes(t.status)).length;
  const overdueTasks = tasks.filter(t => !['Completed', 'Approved', 'Cancelled'].includes(t.status) && new Date(t.due_at) < new Date()).length;

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate('/batches')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{batch.batch_code}</h1>
            <StatusBadge label={batch.status} size="md" />
            <StatusBadge label={batch.health_status} type="health" size="md" />
          </div>
          <p className="text-sm text-gray-500">
            {getBatchTypeLabel(batch.batch_type)} · {(batch as any).species?.name ?? 'No species'} · Started {formatDate(batch.start_date)}
          </p>
        </div>
        {canEdit('batches') && (
          <button onClick={() => setShowEditStatus(true)} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Edit2 size={14} /> Update Status
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Quantity</p>
          <p className="text-xl font-bold text-gray-900">{batch.quantity} <span className="text-sm font-normal text-gray-500">{batch.unit}</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Pending Tasks</p>
          <p className="text-xl font-bold text-gray-900">{pendingTasks} {overdueTasks > 0 && <span className="text-sm text-red-500">({overdueTasks} overdue)</span>}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Location</p>
          <p className="text-sm font-semibold text-gray-900">{(batch as any).room?.name ?? 'Not assigned'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Harvest</p>
          <p className="text-xl font-bold text-gray-900">{totalHarvest.toFixed(1)} <span className="text-sm font-normal text-gray-500">kg</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === tab.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Batch Details</h2>
            <DetailRow icon={Tag} label="Batch ID" value={batch.batch_code} />
            <DetailRow icon={Leaf} label="Type" value={getBatchTypeLabel(batch.batch_type)} />
            <DetailRow icon={Leaf} label="Species" value={(batch as any).species?.name} />
            <DetailRow icon={Tag} label="Strain" value={(batch as any).strain ? `${(batch as any).strain.strain_code}${(batch as any).strain.strain_name ? ' — ' + (batch as any).strain.strain_name : ''}` : undefined} />
            <DetailRow icon={MapPin} label="Location" value={(batch as any).room?.name} />
            <DetailRow icon={Calendar} label="Start Date" value={formatDate(batch.start_date)} />
            <DetailRow icon={Calendar} label="Expected Ready" value={formatDate(batch.expected_ready_date)} />
            <DetailRow icon={User} label="Responsible" value={(batch as any).responsible_user?.full_name} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Notes</h2>
            {batch.notes && <p className="text-sm text-gray-600 mb-4">{batch.notes}</p>}
            {notes.slice(0, 3).map(note => (
              <div key={note.id} className="border-l-2 border-emerald-200 pl-3 py-1 mb-3">
                <p className="text-sm text-gray-700">{note.note}</p>
                <p className="text-xs text-gray-400 mt-1">{(note as any).creator?.full_name ?? 'Unknown'} · {formatDateTime(note.created_at)}</p>
              </div>
            ))}
            <button onClick={() => setShowAddNote(true)} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:underline mt-2">
              <Plus size={14} /> Add note
            </button>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Tasks ({tasks.length})</h2>
            <button onClick={() => navigate('/tasks', { batch_id: batchId })} className="text-sm text-emerald-600 hover:underline">View all</button>
          </div>
          {tasks.length === 0 ? <EmptyState icon={ClipboardList} title="No tasks" description="Tasks will appear here when created from a process template." /> : (
            <div className="divide-y divide-gray-50">
              {tasks.map(task => (
                <button key={task.id} onClick={() => navigate('/tasks/' + task.id)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-left">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${['Completed', 'Approved'].includes(task.status) ? 'bg-emerald-400' : new Date(task.due_at) < new Date() ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(task.due_at)} · {(task as any).assignee?.full_name ?? 'Unassigned'}</p>
                  </div>
                  <StatusBadge label={task.status} type="task" />
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Timeline</h2>
          {events.length === 0 ? <EmptyState icon={Activity} title="No events yet" /> : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
              <div className="space-y-4">
                {events.map(event => (
                  <div key={event.id} className="flex gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 z-10">
                      <Activity size={14} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      {event.description && <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{(event as any).creator?.full_name ?? 'System'} · {formatDateTime(event.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'genealogy' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><GitBranch size={16} /> Source Batches</h2>
            {sources.length === 0 ? <p className="text-sm text-gray-400">No source batches linked.</p> : sources.map(s => (
              <button key={s.id} onClick={() => navigate('/batches/' + s.source_batch_id)} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 border border-gray-100 mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{s.source_batch?.batch_code}</p>
                  <p className="text-xs text-gray-400">{getBatchTypeLabel(s.source_batch?.batch_type ?? '')} · {s.source_batch?.status}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><ChevronRight size={16} /> Derived Batches</h2>
            {children.length === 0 ? <p className="text-sm text-gray-400">No child batches derived from this batch.</p> : children.map(c => (
              <button key={c.id} onClick={() => navigate('/batches/' + c.child_batch_id)} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 border border-gray-100 mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{c.child_batch?.batch_code}</p>
                  <p className="text-xs text-gray-400">{getBatchTypeLabel(c.child_batch?.batch_type ?? '')} · {c.child_batch?.status}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'contamination' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Contamination Reports ({contamination.length})</h2>
            <button onClick={() => navigate('/contamination', { batch_id: batchId })} className="flex items-center gap-1.5 text-sm text-red-500 hover:underline">
              <Plus size={14} /> Report
            </button>
          </div>
          {contamination.length === 0 ? <EmptyState icon={CheckCircle2} title="No contamination reported" description="This batch has no contamination records." /> : (
            <div className="divide-y divide-gray-50">
              {contamination.map(r => (
                <div key={r.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{r.suspected_cause ?? 'Unknown cause'}</span>
                    <StatusBadge label={r.severity} type="severity" />
                  </div>
                  <p className="text-xs text-gray-500">{r.affected_quantity} units · {r.action_taken ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">{(r as any).reporter?.full_name ?? '—'} · {formatDate(r.observed_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'harvest' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Harvests ({harvests.length})</h2>
            <button onClick={() => navigate('/harvest', { batch_id: batchId })} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:underline">
              <Plus size={14} /> Record harvest
            </button>
          </div>
          {harvests.length === 0 ? <EmptyState icon={Scissors} title="No harvests recorded" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-medium text-gray-500">
                    <th className="text-left px-5 py-2.5">Flush</th>
                    <th className="text-left px-3 py-2.5">Date</th>
                    <th className="text-right px-3 py-2.5">Gross (kg)</th>
                    <th className="text-right px-3 py-2.5">Grade A</th>
                    <th className="text-right px-3 py-2.5">Grade B</th>
                    <th className="text-right px-3 py-2.5">Waste</th>
                    <th className="text-left px-3 py-2.5">By</th>
                  </tr>
                </thead>
                <tbody>
                  {harvests.map(h => (
                    <tr key={h.id} className="border-b border-gray-50">
                      <td className="px-5 py-3 font-medium">Flush {h.flush_number}</td>
                      <td className="px-3 py-3 text-gray-500">{formatDate(h.harvested_at)}</td>
                      <td className="px-3 py-3 text-right font-medium">{h.gross_weight}</td>
                      <td className="px-3 py-3 text-right text-emerald-700">{h.grade_a_weight}</td>
                      <td className="px-3 py-3 text-right text-amber-700">{h.grade_b_weight}</td>
                      <td className="px-3 py-3 text-right text-gray-400">{h.waste_weight}</td>
                      <td className="px-3 py-3 text-gray-500">{(h as any).harvester?.full_name ?? '—'}</td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50 font-semibold">
                    <td className="px-5 py-2 text-emerald-800">Total</td>
                    <td />
                    <td className="px-3 py-2 text-right text-emerald-800">{harvests.reduce((s, h) => s + h.gross_weight, 0).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-emerald-800">{harvests.reduce((s, h) => s + h.grade_a_weight, 0).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-emerald-800">{harvests.reduce((s, h) => s + h.grade_b_weight, 0).toFixed(1)}</td>
                    <td className="px-3 py-2 text-right text-emerald-800">{harvests.reduce((s, h) => s + h.waste_weight, 0).toFixed(1)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Notes ({notes.length})</h2>
            <button onClick={() => setShowAddNote(true)} className="flex items-center gap-1.5 text-sm text-emerald-600 hover:underline">
              <Plus size={14} /> Add note
            </button>
          </div>
          {notes.length === 0 ? <EmptyState icon={FileText} title="No notes yet" /> : (
            <div className="space-y-3">
              {notes.map(note => (
                <div key={note.id} className="border border-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{note.note}</p>
                  <p className="text-xs text-gray-400 mt-2">{(note as any).creator?.full_name ?? 'Unknown'} · {formatDateTime(note.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'qr' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">QR Codes for this Batch</h2>
            {canEdit('batches') && (
              <button
                onClick={generateBatchQr}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={14} /> Generate QR
              </button>
            )}
          </div>
          {qrCodes.length === 0 ? (
            <EmptyState icon={QrCode} title="No QR codes yet" description="Generate a QR code to label and track this batch." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {qrCodes.map(qr => (
                <div key={qr.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <QrCodeDisplay qrCode={qr} size={140} onUpdated={fetchAll} />
                  <div className="mt-3 flex gap-2 justify-center">
                    <button
                      onClick={() => navigate(`/qr/${qr.id}/print`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Printer size={12} /> Print Label
                    </button>
                    <button
                      onClick={() => navigate('/scan', { code: qr.qr_text })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <ScanLine size={12} /> Test Scan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Status Modal */}
      <Modal open={showEditStatus} onClose={() => setShowEditStatus(false)} title="Update Batch Status">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              {BATCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Health Status</label>
            <select value={newHealth} onChange={e => setNewHealth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowEditStatus(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={updateStatus} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">Update</button>
          </div>
        </div>
      </Modal>

      {/* Add Note Modal */}
      <Modal open={showAddNote} onClose={() => setShowAddNote(false)} title="Add Note">
        <div className="space-y-4">
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Write your note..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddNote(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={addNote} disabled={!noteText.trim()} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save Note</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon size={14} className="text-gray-400 flex-shrink-0" />
      <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-gray-900 font-medium">{value ?? '—'}</span>
    </div>
  );
}
