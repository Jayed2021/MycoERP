import React, { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, Search, Filter, CheckCircle, Clock, AlertTriangle,
  ChevronRight, Plus, X, Camera, User, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navigate } from '../hooks/useRoute';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { formatDateTime, isOverdue, getOverdueDuration } from '../lib/utils';
import type { Task, Profile, Batch } from '../lib/types';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'today', label: 'Due Today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'pending', label: 'Pending' },
  { value: 'approval', label: 'Needs Approval' },
  { value: 'completed', label: 'Completed' },
];

interface Props {
  filter?: string;
  priority?: string;
  batchId?: string;
}

export default function TaskList({ filter = '', priority = '', batchId = '' }: Props) {
  const { user } = useAuth();
  const { canCreate } = usePermissions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(filter || 'today');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showMyOnly, setShowMyOnly] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, role').eq('is_active', true).then(({ data }) => setProfiles(data ?? []));
    supabase.from('batches').select('id, batch_code').not('status', 'in', '("Closed","Discarded","Spent")').limit(100).then(({ data }) => setBatches(data as Batch[] ?? []));
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      let q = supabase.from('tasks')
        .select('*, batch:batches(batch_code), assignee:profiles!tasks_assigned_to_fkey(full_name, role)')
        .order('due_at');

      if (batchId) q = q.eq('batch_id', batchId);
      if (showMyOnly && user) q = q.eq('assigned_to', user.id);
      if (priority) q = q.eq('priority', priority);
      if (search) q = q.ilike('title', `%${search}%`);

      if (activeFilter === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        q = q.gte('due_at', todayStart).lt('due_at', todayEnd).not('status', 'in', '("Completed","Approved","Cancelled")');
      } else if (activeFilter === 'overdue') {
        q = q.lt('due_at', now.toISOString()).not('status', 'in', '("Completed","Approved","Cancelled")');
      } else if (activeFilter === 'pending') {
        q = q.in('status', ['Pending', 'In Progress']);
      } else if (activeFilter === 'approval') {
        q = q.eq('status', 'Submitted for Approval');
      } else if (activeFilter === 'completed') {
        q = q.in('status', ['Completed', 'Approved']);
      }

      const { data } = await q.limit(100);
      setTasks(data as Task[] ?? []);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search, showMyOnly, user, batchId, priority]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate('tasks') && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto mb-4 pb-1">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setActiveFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === f.value ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex-shrink-0">
          <button onClick={() => setShowMyOnly(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showMyOnly ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            <User size={13} /> My Tasks
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
      </div>

      {loading ? <PageLoader /> : tasks.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No tasks found" description="Adjust your filters or create a new task." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {tasks.map(task => {
              const overdue = isOverdue(task.due_at, task.status);
              return (
                <button key={task.id} onClick={() => navigate('/tasks/' + task.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-left transition-colors ${overdue ? 'bg-red-50/30' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900 truncate">{task.title}</span>
                      {task.photo_required && <Camera size={12} className="text-gray-400 flex-shrink-0" />}
                      {task.approval_required && <ThumbsUp size={12} className="text-violet-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{(task as any).batch?.batch_code ?? 'No batch'}</span>
                      <span>·</span>
                      <span>{(task as any).assignee?.full_name ?? 'Unassigned'}</span>
                      <span>·</span>
                      <span className={overdue ? 'text-red-500 font-medium' : ''}>
                        {overdue ? getOverdueDuration(task.due_at) : formatDateTime(task.due_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge label={task.priority} type="priority" />
                    <StatusBadge label={overdue && !['Completed', 'Approved', 'Cancelled'].includes(task.status) ? 'Overdue' : task.status} type="task" />
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showCreate && <TaskCreateModal onClose={() => setShowCreate(false)} onCreated={fetchTasks} profiles={profiles} batches={batches} />}
    </div>
  );
}

function TaskCreateModal({ onClose, onCreated, profiles, batches }: {
  onClose: () => void;
  onCreated: () => void;
  profiles: Profile[];
  batches: Batch[];
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '', description: '', batch_id: '', assigned_to: '',
    due_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    priority: 'Normal', photo_required: false, approval_required: false,
    department: '', task_type: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!form.title || !form.due_at) { setError('Title and due date are required'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.from('tasks').insert({
        ...form,
        batch_id: form.batch_id || null,
        assigned_to: form.assigned_to || null,
        status: 'Pending',
        created_by: user?.id,
      });
      if (err) { setError(err.message); return; }
      onCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Create Task" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Task title..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Related Batch</label>
            <select value={form.batch_id} onChange={e => setForm(f => ({ ...f, batch_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="">No batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
            <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date/Time *</label>
            <input type="datetime-local" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
              {['Low', 'Normal', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.photo_required} onChange={e => setForm(f => ({ ...f, photo_required: e.target.checked }))} className="rounded" />
            Photo required
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.approval_required} onChange={e => setForm(f => ({ ...f, approval_required: e.target.checked }))} className="rounded" />
            Approval required
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">
            {loading ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
