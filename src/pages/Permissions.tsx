import React, { useEffect, useState } from 'react';
import { Shield, Save, RotateCcw, Check, Eye, Plus, Edit2, Trash2, ThumbsUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { PageLoader } from '../components/LoadingSpinner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MODULES, ROLES, ACTIONS, ACTION_LABELS } from '../lib/permissions';
import type { RolePermission, PermissionAction } from '../lib/permissions';

const ACTION_ICONS: Record<PermissionAction, React.ElementType> = {
  can_view: Eye,
  can_create: Plus,
  can_edit: Edit2,
  can_delete: Trash2,
  can_approve: ThumbsUp,
};

const CATEGORY_LABELS: Record<string, string> = {
  main: 'Main',
  production: 'Production',
  resources: 'Resources',
  admin: 'Administration',
};

export default function Permissions() {
  const { user } = useAuth();
  const { refresh } = usePermissions();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [original, setOriginal] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedRole, setSelectedRole] = useState(ROLES[0].value);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => { fetchPermissions(); }, []);

  async function fetchPermissions() {
    const { data } = await supabase
      .from('role_permissions')
      .select('role, module, can_view, can_create, can_edit, can_delete, can_approve');
    const perms = (data ?? []) as RolePermission[];
    setPermissions(perms);
    setOriginal(JSON.parse(JSON.stringify(perms)));
    setLoading(false);
  }

  function toggle(module: string, action: PermissionAction) {
    setPermissions(prev =>
      prev.map(p =>
        p.role === selectedRole && p.module === module
          ? { ...p, [action]: !p[action] }
          : p
      )
    );
    setSaved(false);
  }

  function toggleAllForModule(module: string, enable: boolean) {
    setPermissions(prev =>
      prev.map(p =>
        p.role === selectedRole && p.module === module
          ? { ...p, can_view: enable, can_create: enable, can_edit: enable, can_delete: enable, can_approve: enable }
          : p
      )
    );
    setSaved(false);
  }

  function hasChanges(): boolean {
    return JSON.stringify(permissions) !== JSON.stringify(original);
  }

  async function save() {
    setSaving(true);
    const rolePerms = permissions.filter(p => p.role === selectedRole);
    for (const perm of rolePerms) {
      await supabase
        .from('role_permissions')
        .update({
          can_view: perm.can_view,
          can_create: perm.can_create,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
          can_approve: perm.can_approve,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('role', perm.role)
        .eq('module', perm.module);
    }
    setSaving(false);
    setSaved(true);
    setOriginal(JSON.parse(JSON.stringify(permissions)));
    await refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  async function resetToDefaults() {
    setLoading(true);
    await supabase.from('role_permissions').delete().eq('role', selectedRole);
    // Re-seed defaults for this role by re-running seed logic
    const defaults = getDefaultsForRole(selectedRole);
    await supabase.from('role_permissions').insert(defaults);
    await fetchPermissions();
    await refresh();
    setShowReset(false);
  }

  function getPermValue(module: string, action: PermissionAction): boolean {
    const perm = permissions.find(p => p.role === selectedRole && p.module === module);
    return perm ? perm[action] : false;
  }

  function getModuleActiveCount(module: string): number {
    const perm = permissions.find(p => p.role === selectedRole && p.module === module);
    if (!perm) return 0;
    return ACTIONS.filter(a => perm[a]).length;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium">Admin access required to manage permissions.</p>
          <p className="text-amber-600 text-sm mt-1">Contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (loading) return <PageLoader />;

  const categories = ['main', 'production', 'resources', 'admin'];

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Shield size={20} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role Permissions</h1>
            <p className="text-sm text-gray-500">Configure what each role can access and do</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReset(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={save}
            disabled={saving || !hasChanges()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 rounded-lg transition-colors"
          >
            {saved ? <Check size={14} /> : <Save size={14} />}
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 mb-6">
        <div className="flex flex-wrap gap-1">
          {ROLES.map(r => (
            <button
              key={r.value}
              onClick={() => setSelectedRole(r.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedRole === r.value
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="space-y-6">
        {categories.map(cat => {
          const modules = MODULES.filter(m => m.category === cat);
          if (modules.length === 0) return null;
          return (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{CATEGORY_LABELS[cat]}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium text-gray-500 w-48">Module</th>
                      {ACTIONS.map(action => {
                        const Icon = ACTION_ICONS[action];
                        return (
                          <th key={action} className="px-3 py-3 text-center font-medium text-gray-500 w-24">
                            <div className="flex flex-col items-center gap-1">
                              <Icon size={14} className="text-gray-400" />
                              <span className="text-xs">{ACTION_LABELS[action]}</span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-3 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {modules.map(mod => {
                      const activeCount = getModuleActiveCount(mod.id);
                      return (
                        <tr key={mod.id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{mod.label}</span>
                              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {activeCount}/{ACTIONS.length}
                              </span>
                            </div>
                          </td>
                          {ACTIONS.map(action => (
                            <td key={action} className="px-3 py-3 text-center">
                              <button
                                onClick={() => toggle(mod.id, action)}
                                disabled={selectedRole === 'admin' && action === 'can_view'}
                                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                                  getPermValue(mod.id, action)
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'bg-white border-gray-200 text-transparent hover:border-gray-300'
                                } ${selectedRole === 'admin' && action === 'can_view' ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <Check size={14} />
                              </button>
                            </td>
                          ))}
                          <td className="px-3 py-3 text-center">
                            <div className="flex gap-1">
                              <button
                                onClick={() => toggleAllForModule(mod.id, true)}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium px-1.5 py-0.5 rounded hover:bg-emerald-50"
                              >
                                All
                              </button>
                              <button
                                onClick={() => toggleAllForModule(mod.id, false)}
                                className="text-xs text-gray-400 hover:text-gray-600 font-medium px-1.5 py-0.5 rounded hover:bg-gray-100"
                              >
                                None
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges() && (
        <div className="fixed bottom-4 right-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm text-amber-800 font-medium">Unsaved changes</span>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
          >
            Save
          </button>
        </div>
      )}

      {showReset && (
        <ConfirmDialog
          open={true}
          title="Reset Permissions"
          message={`This will reset all permissions for "${ROLES.find(r => r.value === selectedRole)?.label}" to their default values. This cannot be undone.`}
          confirmLabel="Reset"
          onConfirm={resetToDefaults}
          onClose={() => setShowReset(false)}
        />
      )}
    </div>
  );
}

function getDefaultsForRole(role: string): Omit<RolePermission, 'id'>[] {
  const allModules = MODULES.map(m => m.id);
  const defaults: Record<string, Record<string, Omit<RolePermission, 'id'>>> = {
    admin: Object.fromEntries(allModules.map(m => [m, { role: 'admin', module: m, can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true }])),
    manager: Object.fromEntries(allModules.map(m => [m, { role: 'manager', module: m, can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true }])),
    lab_worker: Object.fromEntries(allModules.map(m => [m, { role: 'lab_worker', module: m, can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: false }])),
    production_worker: Object.fromEntries(allModules.map(m => [m, { role: 'production_worker', module: m, can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: false }])),
    harvest_worker: Object.fromEntries(allModules.map(m => [m, { role: 'harvest_worker', module: m, can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: false }])),
    viewer: Object.fromEntries(allModules.map(m => [m, { role: 'viewer', module: m, can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: false }])),
  };

  // Manager overrides
  defaults.manager['users'] = { role: 'manager', module: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
  defaults.manager['devices'] = { role: 'manager', module: 'devices', can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: false };
  defaults.manager['reports'] = { role: 'manager', module: 'reports', can_view: true, can_create: false, can_edit: false, can_delete: false, can_approve: false };

  // Lab worker overrides
  const labWrite = ['batches', 'tasks', 'inventory', 'contamination', 'env_logs'];
  for (const m of labWrite) {
    defaults.lab_worker[m] = { role: 'lab_worker', module: m, can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false };
  }
  defaults.lab_worker['qr_codes'] = { role: 'lab_worker', module: 'qr_codes', can_view: true, can_create: true, can_edit: false, can_delete: false, can_approve: false };
  defaults.lab_worker['reports'] = { role: 'lab_worker', module: 'reports', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
  defaults.lab_worker['users'] = { role: 'lab_worker', module: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
  defaults.lab_worker['devices'] = { role: 'lab_worker', module: 'devices', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };

  // Production worker overrides
  const prodWrite = ['batches', 'tasks', 'inventory', 'contamination', 'harvests', 'env_logs'];
  for (const m of prodWrite) {
    defaults.production_worker[m] = { role: 'production_worker', module: m, can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false };
  }
  defaults.production_worker['qr_codes'] = { role: 'production_worker', module: 'qr_codes', can_view: true, can_create: true, can_edit: false, can_delete: false, can_approve: false };
  defaults.production_worker['reports'] = { role: 'production_worker', module: 'reports', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
  defaults.production_worker['users'] = { role: 'production_worker', module: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
  defaults.production_worker['devices'] = { role: 'production_worker', module: 'devices', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };

  // Harvest worker overrides
  const harvestWrite = ['tasks', 'contamination', 'harvests', 'env_logs'];
  for (const m of harvestWrite) {
    defaults.harvest_worker[m] = { role: 'harvest_worker', module: m, can_view: true, can_create: true, can_edit: true, can_delete: false, can_approve: false };
  }
  defaults.harvest_worker['qr_codes'] = { role: 'harvest_worker', module: 'qr_codes', can_view: true, can_create: true, can_edit: false, can_delete: false, can_approve: false };
  defaults.harvest_worker['reports'] = { role: 'harvest_worker', module: 'reports', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
  defaults.harvest_worker['users'] = { role: 'harvest_worker', module: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
  defaults.harvest_worker['devices'] = { role: 'harvest_worker', module: 'devices', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };

  // Viewer overrides
  defaults.viewer['reports'] = { role: 'viewer', module: 'reports', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
  defaults.viewer['users'] = { role: 'viewer', module: 'users', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };
  defaults.viewer['devices'] = { role: 'viewer', module: 'devices', can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false };

  return Object.values(defaults[role] ?? {});
}
