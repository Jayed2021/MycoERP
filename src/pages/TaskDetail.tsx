import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Clock, User, Tag, Camera, ThumbsUp, CheckCircle2,
  XCircle, AlertTriangle, Edit2, FileText, ScanLine, QrCode,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navigate } from '../hooks/useRoute';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDateTime, isOverdue, getOverdueDuration, canManage } from '../lib/utils';
import type { Task, TaskQrVerification } from '../lib/types';

export default function TaskDetail({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [verifications, setVerifications] = useState<TaskQrVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionNote, setCompletionNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchTask(); }, [taskId]);

  async function fetchTask() {
    const [taskRes, verRes] = await Promise.all([
      supabase.from('tasks')
        .select('*, batch:batches(batch_code, id, species:species(name)), assignee:profiles!tasks_assigned_to_fkey(full_name), completer:profiles!tasks_completed_by_fkey(full_name), approver:profiles!tasks_approved_by_fkey(full_name)')
        .eq('id', taskId)
        .single(),
      supabase.from('task_qr_verifications').select('*').eq('task_id', taskId).order('verified_at', { ascending: false }),
    ]);
    setTask(taskRes.data as Task);
    setVerifications(verRes.data as TaskQrVerification[] ?? []);
    setLoading(false);
  }

  async function completeTask() {
    if (!user || !task) return;
    if (task.photo_required && !photoUrl.trim()) { setError('A photo URL is required to complete this task.'); return; }
    setActionLoading(true);
    setError('');
    try {
      const newStatus = task.approval_required ? 'Submitted for Approval' : 'Completed';
      const now = new Date().toISOString();
      await supabase.from('tasks').update({
        status: newStatus,
        completed_by: user.id,
        completed_at: now,
        submitted_at: task.approval_required ? now : null,
        notes: completionNote || null,
        photo_url: photoUrl || null,
        updated_at: now,
      }).eq('id', taskId);

      if (task.batch_id) {
        await supabase.from('batch_events').insert({
          batch_id: task.batch_id,
          event_type: 'task_completed',
          title: `Task completed: ${task.title}`,
          description: completionNote || null,
          related_task_id: taskId,
          created_by: user.id,
        });
      }

      // Send notification if needs approval
      if (task.approval_required) {
        // Notify managers/admins
        const { data: managers } = await supabase.from('profiles').select('id').in('role', ['admin', 'manager']);
        if (managers && managers.length > 0) {
          await supabase.from('notifications').insert(managers.map(m => ({
            user_id: m.id,
            title: 'Task needs approval',
            body: `"${task.title}" was completed and awaits your approval.`,
            notification_type: 'approval_needed',
            related_task_id: taskId,
            related_batch_id: task.batch_id,
          })));
        }
      }

      fetchTask();
    } finally {
      setActionLoading(false);
    }
  }

  async function approveTask() {
    if (!user || !task) return;
    setActionLoading(true);
    const now = new Date().toISOString();
    await supabase.from('tasks').update({ status: 'Approved', approved_by: user.id, approved_at: now, updated_at: now }).eq('id', taskId);

    if (task.batch_id) {
      await supabase.from('batch_events').insert({
        batch_id: task.batch_id,
        event_type: 'task_approved',
        title: `Task approved: ${task.title}`,
        created_by: user.id,
      });
    }

    // Notify assignee
    if (task.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: task.assigned_to,
        title: 'Task approved',
        body: `Your submission for "${task.title}" was approved.`,
        notification_type: 'task_approved',
        related_task_id: taskId,
      });
    }

    setActionLoading(false);
    fetchTask();
  }

  async function rejectTask() {
    if (!user || !task || !rejectionReason.trim()) { setError('Rejection reason is required.'); return; }
    setActionLoading(true);
    const now = new Date().toISOString();
    await supabase.from('tasks').update({
      status: 'Rejected',
      rejected_by: user.id,
      rejected_at: now,
      rejection_reason: rejectionReason,
      updated_at: now,
    }).eq('id', taskId);

    if (task.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: task.assigned_to,
        title: 'Task rejected',
        body: `"${task.title}" was rejected: ${rejectionReason}`,
        notification_type: 'task_rejected',
        related_task_id: taskId,
      });
    }

    setRejectionReason('');
    setActionLoading(false);
    fetchTask();
  }

  if (loading) return <PageLoader />;
  if (!task) return <div className="p-6 text-gray-500">Task not found.</div>;

  const overdue = isOverdue(task.due_at, task.status);
  const isAssignee = user?.id === task.assigned_to;
  const isManager = canManage(user?.role ?? '');
  const canComplete = (isAssignee || isManager) && ['Pending', 'In Progress', 'Rejected'].includes(task.status);
  const canApprove = isManager && task.status === 'Submitted for Approval';

  // QR requirements — from extended task fields
  const taskAny = task as any;
  const qrRequirements: { key: string; label: string; required: boolean }[] = [
    { key: 'batch', label: 'Batch QR', required: !!taskAny.qr_required },
    { key: 'location', label: 'Location QR', required: !!taskAny.location_qr_required },
    { key: 'checkpoint', label: 'Checkpoint QR', required: !!taskAny.checkpoint_qr_required },
    { key: 'crate', label: 'Crate QR', required: !!taskAny.crate_qr_required },
  ].filter(r => r.required);

  function isVerified(key: string): boolean {
    return verifications.some(v => v.verification_type === key && v.result === 'Matched');
  }

  const allQrMet = qrRequirements.every(r => isVerified(r.key));
  const blockComplete = canComplete && qrRequirements.length > 0 && !allQrMet;

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/tasks')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Task Detail</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h2>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={overdue && !['Completed', 'Approved', 'Cancelled'].includes(task.status) ? 'Overdue' : task.status} type="task" size="md" />
            <StatusBadge label={task.priority} type="priority" size="md" />
            {task.photo_required && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"><Camera size={11} /> Photo required</span>}
            {task.approval_required && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700"><ThumbsUp size={11} /> Approval required</span>}
          </div>
        </div>

        {task.description && (
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Instructions</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{task.description}</p>
          </div>
        )}

        {/* Task Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Tag size={14} className="text-gray-400" />
            <span className="text-gray-500">Batch:</span>
            {(task as any).batch ? (
              <button onClick={() => navigate('/batches/' + (task as any).batch.id)} className="text-emerald-600 hover:underline">
                {(task as any).batch.batch_code}
              </button>
            ) : <span className="text-gray-400">—</span>}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <User size={14} className="text-gray-400" />
            <span className="text-gray-500">Assigned to:</span>
            <span>{(task as any).assignee?.full_name ?? 'Unassigned'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={14} className={overdue ? 'text-red-400' : 'text-gray-400'} />
            <span className="text-gray-500">Due:</span>
            <span className={overdue ? 'text-red-600 font-medium' : ''}>
              {overdue ? getOverdueDuration(task.due_at) : formatDateTime(task.due_at)}
            </span>
          </div>
          {task.department && (
            <div className="flex items-center gap-2 text-gray-600">
              <Tag size={14} className="text-gray-400" />
              <span className="text-gray-500">Dept:</span>
              <span>{task.department}</span>
            </div>
          )}
        </div>

        {/* Rejection notice */}
        {task.status === 'Rejected' && task.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800 mb-1">Task Rejected</p>
            <p className="text-sm text-red-700">{task.rejection_reason}</p>
          </div>
        )}

        {/* Completion info */}
        {['Completed', 'Approved', 'Submitted for Approval'].includes(task.status) && task.completed_at && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 size={14} />
              <span>Completed by {(task as any).completer?.full_name ?? '—'} at {formatDateTime(task.completed_at)}</span>
            </div>
            {task.notes && <p className="text-sm text-emerald-600 pl-5">{task.notes}</p>}
            {task.photo_url && (
              <div className="pl-5">
                <p className="text-xs text-emerald-600 mb-1">Photo submitted:</p>
                <p className="text-xs text-emerald-500 break-all">{task.photo_url}</p>
              </div>
            )}
          </div>
        )}

        {task.status === 'Approved' && task.approved_at && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <ThumbsUp size={14} />
            <span>Approved by {(task as any).approver?.full_name ?? '—'} at {formatDateTime(task.approved_at)}</span>
          </div>
        )}

        {/* QR Verification Checklist */}
        {qrRequirements.length > 0 && canComplete && (
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <QrCode size={15} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">QR Verification Required</h3>
            </div>
            <div className="space-y-2">
              {qrRequirements.map(req => {
                const verified = isVerified(req.key);
                return (
                  <div key={req.key} className={`flex items-center justify-between p-3 rounded-lg border ${verified ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2.5">
                      {verified
                        ? <CheckCircle2 size={16} className="text-emerald-500" />
                        : <QrCode size={16} className="text-gray-400" />}
                      <span className={`text-sm font-medium ${verified ? 'text-emerald-700' : 'text-gray-700'}`}>{req.label}</span>
                      {verified && <span className="text-xs text-emerald-500">Verified</span>}
                    </div>
                    {!verified && (
                      <button
                        onClick={() => navigate('/scan', { task_id: taskId, required: req.key })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                      >
                        <ScanLine size={12} /> Scan
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {isManager && !allQrMet && (
              <button
                onClick={async () => {
                  for (const req of qrRequirements.filter(r => !isVerified(r.key))) {
                    await supabase.from('task_qr_verifications').insert({
                      task_id: taskId,
                      qr_code_id: null,
                      verification_type: req.key,
                      verified_by: user?.id,
                      result: 'Matched',
                      is_manager_override: true,
                      notes: 'Manager override',
                    });
                  }
                  fetchTask();
                }}
                className="text-xs text-amber-600 hover:underline flex items-center gap-1"
              >
                <AlertTriangle size={11} /> Override QR requirements (manager)
              </button>
            )}
          </div>
        )}

        {/* Completion form */}
        {canComplete && (
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Complete This Task</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Completion Notes</label>
              <textarea value={completionNote} onChange={e => setCompletionNote(e.target.value)} rows={2} placeholder="Optional notes about this task completion..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            {(task.photo_required || photoUrl) && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Photo URL {task.photo_required && <span className="text-red-500">*</span>}</label>
                <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="Paste image URL or Pexels link..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                <p className="text-xs text-gray-400 mt-1">Paste a photo URL as proof of task completion.</p>
              </div>
            )}
            {!task.photo_required && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Photo URL (optional)</label>
                <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="Optional photo URL..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={completeTask} disabled={actionLoading || blockComplete}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition-colors">
              {blockComplete ? 'Complete QR scans first' : actionLoading ? 'Saving…' : task.approval_required ? 'Submit for Approval' : 'Mark Complete'}
            </button>
          </div>
        )}

        {/* Approval form */}
        {canApprove && (
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Review Submission</h3>
            <p className="text-sm text-gray-600">Submitted by {(task as any).completer?.full_name} at {formatDateTime(task.submitted_at)}</p>
            {task.notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Worker notes:</p>
                <p className="text-sm text-gray-700">{task.notes}</p>
              </div>
            )}
            {task.photo_url && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Photo proof:</p>
                <p className="text-sm text-blue-600 break-all">{task.photo_url}</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rejection reason (if rejecting)</label>
              <input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this is being rejected..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={approveTask} disabled={actionLoading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
                <ThumbsUp size={14} /> Approve
              </button>
              <button onClick={rejectTask} disabled={actionLoading || !rejectionReason.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
