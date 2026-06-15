/*
# Role Permissions System

Creates a database-backed permissions system that allows admins to modify 
what each user role can do at runtime -- no redeployment required.

## New Tables

### role_permissions
- `id` (uuid, primary key) - Unique permission record ID
- `role` (text, not null) - One of: admin, manager, lab_worker, production_worker, harvest_worker, viewer
- `module` (text, not null) - Module/feature identifier (e.g., dashboard, batches, tasks, users)
- `can_view` (boolean, default false) - Whether the role can view/access this module
- `can_create` (boolean, default false) - Whether the role can create new records in this module
- `can_edit` (boolean, default false) - Whether the role can edit existing records
- `can_delete` (boolean, default false) - Whether the role can delete records
- `can_approve` (boolean, default false) - Whether the role can approve/reject items (tasks, reports)
- `updated_at` (timestamptz) - Last modification timestamp
- `updated_by` (uuid, nullable) - Who last changed this permission record

## Security
- RLS enabled
- All authenticated users can SELECT (read permissions for their role)
- Only admins can INSERT/UPDATE/DELETE (modify permissions)

## Seed Data
- Populates default permissions for all 6 roles across all 14 modules
- Admin: full access to everything
- Manager: full access to production modules, view-only on admin modules
- Lab Worker: view + create + edit on lab-related modules
- Production Worker: view + create + edit on production-related modules
- Harvest Worker: view + create + edit on harvest module, view-only elsewhere
- Viewer: view-only access to all modules, no write capabilities

## Notes
1. Unique constraint on (role, module) ensures one permission record per role per module
2. The application loads permissions on login and caches them in React context
3. Changing permissions takes effect on the next page load for affected users
*/

-- ROLE PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'lab_worker', 'production_worker', 'harvest_worker', 'viewer')),
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(role, module)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read permissions
DROP POLICY IF EXISTS "role_permissions_select" ON role_permissions;
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT
  TO authenticated USING (true);

-- Only admins can insert permissions
DROP POLICY IF EXISTS "role_permissions_insert" ON role_permissions;
CREATE POLICY "role_permissions_insert" ON role_permissions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can update permissions
DROP POLICY IF EXISTS "role_permissions_update" ON role_permissions;
CREATE POLICY "role_permissions_update" ON role_permissions FOR UPDATE
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Only admins can delete permissions
DROP POLICY IF EXISTS "role_permissions_delete" ON role_permissions;
CREATE POLICY "role_permissions_delete" ON role_permissions FOR DELETE
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- SEED DEFAULT PERMISSIONS
-- Modules: dashboard, batches, tasks, species_strains, rooms, inventory, process_templates, qr_codes, contamination, harvests, env_logs, reports, users, devices

INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve) VALUES
  -- ADMIN: full access to everything
  ('admin', 'dashboard', true, true, true, true, true),
  ('admin', 'batches', true, true, true, true, true),
  ('admin', 'tasks', true, true, true, true, true),
  ('admin', 'species_strains', true, true, true, true, true),
  ('admin', 'rooms', true, true, true, true, true),
  ('admin', 'inventory', true, true, true, true, true),
  ('admin', 'process_templates', true, true, true, true, true),
  ('admin', 'qr_codes', true, true, true, true, true),
  ('admin', 'contamination', true, true, true, true, true),
  ('admin', 'harvests', true, true, true, true, true),
  ('admin', 'env_logs', true, true, true, true, true),
  ('admin', 'reports', true, true, true, true, true),
  ('admin', 'users', true, true, true, true, true),
  ('admin', 'devices', true, true, true, true, true),

  -- MANAGER: full production access, view admin modules
  ('manager', 'dashboard', true, true, true, true, true),
  ('manager', 'batches', true, true, true, true, true),
  ('manager', 'tasks', true, true, true, true, true),
  ('manager', 'species_strains', true, true, true, true, false),
  ('manager', 'rooms', true, true, true, true, false),
  ('manager', 'inventory', true, true, true, true, false),
  ('manager', 'process_templates', true, true, true, true, false),
  ('manager', 'qr_codes', true, true, true, true, false),
  ('manager', 'contamination', true, true, true, true, true),
  ('manager', 'harvests', true, true, true, true, true),
  ('manager', 'env_logs', true, true, true, false, false),
  ('manager', 'reports', true, false, false, false, false),
  ('manager', 'users', false, false, false, false, false),
  ('manager', 'devices', true, false, false, false, false),

  -- LAB WORKER: lab-focused access
  ('lab_worker', 'dashboard', true, false, false, false, false),
  ('lab_worker', 'batches', true, true, true, false, false),
  ('lab_worker', 'tasks', true, true, true, false, false),
  ('lab_worker', 'species_strains', true, false, false, false, false),
  ('lab_worker', 'rooms', true, false, false, false, false),
  ('lab_worker', 'inventory', true, true, true, false, false),
  ('lab_worker', 'process_templates', true, false, false, false, false),
  ('lab_worker', 'qr_codes', true, true, false, false, false),
  ('lab_worker', 'contamination', true, true, true, false, false),
  ('lab_worker', 'harvests', true, false, false, false, false),
  ('lab_worker', 'env_logs', true, true, false, false, false),
  ('lab_worker', 'reports', false, false, false, false, false),
  ('lab_worker', 'users', false, false, false, false, false),
  ('lab_worker', 'devices', false, false, false, false, false),

  -- PRODUCTION WORKER: production-focused access
  ('production_worker', 'dashboard', true, false, false, false, false),
  ('production_worker', 'batches', true, true, true, false, false),
  ('production_worker', 'tasks', true, true, true, false, false),
  ('production_worker', 'species_strains', true, false, false, false, false),
  ('production_worker', 'rooms', true, false, false, false, false),
  ('production_worker', 'inventory', true, true, true, false, false),
  ('production_worker', 'process_templates', true, false, false, false, false),
  ('production_worker', 'qr_codes', true, true, false, false, false),
  ('production_worker', 'contamination', true, true, true, false, false),
  ('production_worker', 'harvests', true, true, true, false, false),
  ('production_worker', 'env_logs', true, true, false, false, false),
  ('production_worker', 'reports', false, false, false, false, false),
  ('production_worker', 'users', false, false, false, false, false),
  ('production_worker', 'devices', false, false, false, false, false),

  -- HARVEST WORKER: harvest-focused access
  ('harvest_worker', 'dashboard', true, false, false, false, false),
  ('harvest_worker', 'batches', true, false, false, false, false),
  ('harvest_worker', 'tasks', true, true, true, false, false),
  ('harvest_worker', 'species_strains', true, false, false, false, false),
  ('harvest_worker', 'rooms', true, false, false, false, false),
  ('harvest_worker', 'inventory', true, false, false, false, false),
  ('harvest_worker', 'process_templates', true, false, false, false, false),
  ('harvest_worker', 'qr_codes', true, true, false, false, false),
  ('harvest_worker', 'contamination', true, true, false, false, false),
  ('harvest_worker', 'harvests', true, true, true, false, false),
  ('harvest_worker', 'env_logs', true, true, false, false, false),
  ('harvest_worker', 'reports', false, false, false, false, false),
  ('harvest_worker', 'users', false, false, false, false, false),
  ('harvest_worker', 'devices', false, false, false, false, false),

  -- VIEWER: read-only access to production modules
  ('viewer', 'dashboard', true, false, false, false, false),
  ('viewer', 'batches', true, false, false, false, false),
  ('viewer', 'tasks', true, false, false, false, false),
  ('viewer', 'species_strains', true, false, false, false, false),
  ('viewer', 'rooms', true, false, false, false, false),
  ('viewer', 'inventory', true, false, false, false, false),
  ('viewer', 'process_templates', true, false, false, false, false),
  ('viewer', 'qr_codes', true, false, false, false, false),
  ('viewer', 'contamination', true, false, false, false, false),
  ('viewer', 'harvests', true, false, false, false, false),
  ('viewer', 'env_logs', true, false, false, false, false),
  ('viewer', 'reports', false, false, false, false, false),
  ('viewer', 'users', false, false, false, false, false),
  ('viewer', 'devices', false, false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;
