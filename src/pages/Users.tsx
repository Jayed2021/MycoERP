import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Eye, EyeOff, Trash2, UserCheck, UserX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDate, getRoleLabel } from '../lib/utils';
import type { Profile } from '../lib/types';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Farm Manager' },
  { value: 'lab_worker', label: 'Lab Worker' },
  { value: 'production_worker', label: 'Production Worker' },
  { value: 'harvest_worker', label: 'Harvest Worker' },
  { value: 'viewer', label: 'Viewer' },
];
const DEPARTMENTS = ['Lab', 'Spawn', 'Substrate', 'Incubation', 'Fruiting', 'Harvest', 'Packaging', 'Management'];

async function callAdminUsers(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Not authenticated' };
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { ok: false, error: data?.error ?? `Request failed (${res.status})` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}

export default function UserManagement() {
  const { user } = useAuth();
  const { canView, canCreate, canDelete } = usePermissions();
  const { t } = useTranslation();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [pageError, setPageError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setUsers(data ?? []);
    setLoading(false);
  }

  async function toggleActive(profile: Profile) {
    const { error } = await supabase.from('profiles').update({ is_active: !profile.is_active, updated_at: new Date().toISOString() }).eq('id', profile.id);
    setPageError(error ? t('users.updateFailed') : '');
    fetchUsers();
  }

  async function deleteUser(profile: Profile) {
    const result = await callAdminUsers({ action: 'delete', user_id: profile.id });
    setPageError(result.ok ? '' : (result.error ?? t('users.deleteFailed')));
    fetchUsers();
  }

  if (!canView('users')) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium">Admin access required to manage users.</p>
          <p className="text-amber-600 text-sm mt-1">Contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (loading) return <PageLoader />;

  const activeUsers = users.filter(u => u.is_active).length;
  const roleCount: Record<string, number> = {};
  for (const u of users) roleCount[u.role] = (roleCount[u.role] ?? 0) + 1;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{activeUsers} active · {users.length} total</p>
        </div>
        {canCreate('users') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            {t('users.addUser')}
          </button>
        )}
      </div>

      {pageError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
          {pageError}
        </div>
      )}

      {/* Role summary */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {ROLES.map(r => (
          <div key={r.value} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-xl font-bold text-gray-900">{roleCount[r.value] ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{r.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-3 py-3">Role</th>
                <th className="text-left px-3 py-3 hidden lg:table-cell">Department</th>
                <th className="text-left px-3 py-3 hidden lg:table-cell">Created</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm flex-shrink-0">
                        {u.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.full_name}</p>
                        <p className="text-xs text-gray-400">{u.id === user?.id ? 'You' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 font-medium">{getRoleLabel(u.role)}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 hidden lg:table-cell">{u.department ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-400 hidden lg:table-cell">{formatDate(u.created_at)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge label={u.is_active ? 'Active' : 'Inactive'} color={u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setEditUser(u); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <Edit2 size={13} className="text-gray-400" />
                      </button>
                      {u.id !== user?.id && (
                        <button onClick={() => toggleActive(u)}
                          title={u.is_active ? t('users.deactivate') : t('users.activate')}
                          className={`p-1.5 rounded-lg hover:${u.is_active ? 'bg-red-50' : 'bg-emerald-50'}`}>
                          {u.is_active ? <UserX size={13} className="text-red-400" /> : <UserCheck size={13} className="text-emerald-400" />}
                        </button>
                      )}
                      {u.id !== user?.id && canDelete('users') && (
                        <button onClick={() => setDeleteTarget(u)} title={t('common.delete')}
                          className="p-1.5 rounded-lg hover:bg-red-50">
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && editUser && (
        <EditUserModal user={editUser} onClose={() => setShowModal(false)} onSaved={fetchUsers} />
      )}

      {showAddModal && (
        <AddUserModal onClose={() => setShowAddModal(false)} onSaved={fetchUsers} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteUser(deleteTarget); }}
        title={t('users.deleteUser')}
        message={t('users.deleteConfirm', { name: deleteTarget?.full_name ?? '' })}
        confirmLabel={t('common.delete')}
        danger
      />
    </div>
  );
}

function AddUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'production_worker', department: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await callAdminUsers({
      action: 'create',
      email: form.email.trim(),
      password: form.password,
      full_name: form.full_name.trim(),
      role: form.role,
      department: form.department || null,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? t('users.createFailed'));
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={t('users.addUser')} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.fullName')}</label>
          <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.tempPassword')}</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">{t('users.tempPasswordHint')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.role')}</label>
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.department')}</label>
          <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">None</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">{t('common.cancel')}</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">
            {loading ? t('common.pleaseWait') : t('users.createUser')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: Profile; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ full_name: user.full_name, role: user.role, department: user.department ?? '', is_active: user.is_active });
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    await supabase.from('profiles').update({ ...form, department: form.department || null, updated_at: new Date().toISOString() }).eq('id', user.id);
    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Edit User" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">None</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          Active
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={loading} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  );
}
