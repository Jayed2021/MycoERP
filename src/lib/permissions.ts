import type { UserRole } from './types';

export type PermissionAction = 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_approve';

export interface ModuleDefinition {
  id: string;
  label: string;
  category: 'main' | 'production' | 'resources' | 'admin';
}

export interface RolePermission {
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

export const MODULES: ModuleDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', category: 'main' },
  { id: 'tasks', label: 'Tasks', category: 'main' },
  { id: 'batches', label: 'Batches', category: 'production' },
  { id: 'contamination', label: 'Contamination Reports', category: 'production' },
  { id: 'harvests', label: 'Harvests', category: 'production' },
  { id: 'env_logs', label: 'Environmental Logs', category: 'production' },
  { id: 'inventory', label: 'Inventory', category: 'resources' },
  { id: 'rooms', label: 'Rooms', category: 'resources' },
  { id: 'species_strains', label: 'Species & Strains', category: 'resources' },
  { id: 'process_templates', label: 'Process Templates', category: 'resources' },
  { id: 'qr_codes', label: 'QR Codes', category: 'resources' },
  { id: 'reports', label: 'Reports', category: 'admin' },
  { id: 'users', label: 'Users', category: 'admin' },
  { id: 'devices', label: 'IoT Devices', category: 'admin' },
];

export const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Farm Manager' },
  { value: 'lab_worker', label: 'Lab Worker' },
  { value: 'production_worker', label: 'Production Worker' },
  { value: 'harvest_worker', label: 'Harvest Worker' },
  { value: 'viewer', label: 'Viewer' },
];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  can_view: 'View',
  can_create: 'Create',
  can_edit: 'Edit',
  can_delete: 'Delete',
  can_approve: 'Approve',
};

export const ACTIONS: PermissionAction[] = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_approve'];

export function getPermission(
  permissions: RolePermission[],
  role: string,
  module: string,
  action: PermissionAction
): boolean {
  const perm = permissions.find(p => p.role === role && p.module === module);
  if (!perm) return role === 'admin';
  return perm[action];
}

export function canViewModule(permissions: RolePermission[], role: string, module: string): boolean {
  return getPermission(permissions, role, module, 'can_view');
}

export function canCreateInModule(permissions: RolePermission[], role: string, module: string): boolean {
  return getPermission(permissions, role, module, 'can_create');
}

export function canEditInModule(permissions: RolePermission[], role: string, module: string): boolean {
  return getPermission(permissions, role, module, 'can_edit');
}

export function canDeleteInModule(permissions: RolePermission[], role: string, module: string): boolean {
  return getPermission(permissions, role, module, 'can_delete');
}

export function canApproveInModule(permissions: RolePermission[], role: string, module: string): boolean {
  return getPermission(permissions, role, module, 'can_approve');
}
