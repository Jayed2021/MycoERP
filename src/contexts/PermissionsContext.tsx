import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { RolePermission, PermissionAction } from '../lib/permissions';
import { getPermission } from '../lib/permissions';

interface PermissionsContextValue {
  permissions: RolePermission[];
  loading: boolean;
  can: (module: string, action: PermissionAction) => boolean;
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  canApprove: (module: string) => boolean;
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    const { data } = await supabase
      .from('role_permissions')
      .select('role, module, can_view, can_create, can_edit, can_delete, can_approve');
    setPermissions(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchPermissions();
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [user, fetchPermissions]);

  const role = user?.role ?? 'viewer';

  const can = useCallback(
    (module: string, action: PermissionAction) => getPermission(permissions, role, module, action),
    [permissions, role]
  );

  const canView = useCallback((module: string) => can(module, 'can_view'), [can]);
  const canCreate = useCallback((module: string) => can(module, 'can_create'), [can]);
  const canEdit = useCallback((module: string) => can(module, 'can_edit'), [can]);
  const canDelete = useCallback((module: string) => can(module, 'can_delete'), [can]);
  const canApprove = useCallback((module: string) => can(module, 'can_approve'), [can]);

  return (
    <PermissionsContext.Provider value={{ permissions, loading, can, canView, canCreate, canEdit, canDelete, canApprove, refresh: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider');
  return ctx;
}
