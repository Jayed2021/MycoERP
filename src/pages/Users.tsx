import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Users, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
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

export default function UserManagement() {
  const { user } = useAuth();
  const { canView } = usePermissions();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setUsers(data ?? []);
    setLoading(false);
  }

  async function toggleActive(profile: Profile) {
    await supabase.from('profiles').update({ is_active: !profile.is_active, updated_at: new Date().toISOString() }).eq('id', profile.id);
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
      </div>

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
                          className={`p-1.5 rounded-lg hover:${u.is_active ? 'bg-red-50' : 'bg-emerald-50'}`}>
                          {u.is_active ? <UserX size={13} className="text-red-400" /> : <UserCheck size={13} className="text-emerald-400" />}
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
    </div>
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
