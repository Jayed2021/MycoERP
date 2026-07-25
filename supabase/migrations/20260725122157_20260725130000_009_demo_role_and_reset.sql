/*
# Demo Role, Demo Mode Setting, and App Data Reset Function

Adds a limited-power "demo" role for showcasing the app to non-technical
viewers, plus a server-side function that wipes all operational/test data
while preserving the foundational catalog (species, strains, rooms, recipes,
process templates, role permissions, app settings, IoT device config, and
admin user accounts).

## Why
The farm owner wants a one-click "Explore the demo" sign-in so a non-technical
viewer can try the full day-to-day workflow (batches, tasks, harvests, etc.)
without full admin power (no deleting anything, no managing users or devices).
When ready to go to production, a "Reset all data" button clears everything
accumulated during demos/testing so the app starts clean.

## 1. Expand allowed roles (profiles + role_permissions)
The `role` columns on `profiles` and `role_permissions` had CHECK constraints
limited to the original six roles. Both are expanded to also accept 'demo'.

## 2. Demo role permissions (role_permissions)
Seeds 14 module rows for role = 'demo' with manager-like access to the
production/work modules but with NO delete permission anywhere and view-only
access to the admin modules (users, devices):

- dashboard, reports            -> view only
- tasks, batches, contamination,
  harvests                      -> view, create, edit, approve (NO delete)
- env_logs, inventory, rooms,
  species_strains, process_templates,
  qr_codes                      -> view, create, edit (NO delete, NO approve)
- users, devices                -> view only (cannot manage)

This lets a demo viewer create and work through batches, tasks, harvests,
contamination reports, environmental logs, inventory, QR codes, etc. exactly
like a real farm manager, but they can never delete records or touch other
accounts or device configuration.

## 3. demo_mode app setting (app_settings)
Seeds a `demo_mode` key with `{ "enabled": true }`. The demo-access edge
function reads this as the server-side gate before creating/refreshing the
demo account, so production is safe once this is flipped to false (the reset
action does that automatically). Admins can also toggle it from General settings.

## 4. reset_app_data() function
A SECURITY DEFINER plpgsql function that clears all operational/test data and
restores the seeded inventory catalog. It is invoked by the admin-only
reset-data edge function via RPC.

Tables CLEARED (operational data): task_qr_verifications, qr_scan_logs,
batch_movements, batch_photos, batch_notes, batch_events, batch_sources,
contamination_reports, harvests, environmental_alerts, environmental_logs,
inventory_audit_lines, inventory_audits, inventory_movements, tasks,
notifications, qr_codes, batches, inventory_items.

Tables PRESERVED (foundational catalog + config): species, strains, rooms,
racks, shelves, recipes, recipe_ingredients, process_templates,
process_template_steps, role_permissions, app_settings, profiles,
iot_devices.

After clearing, the 16 seeded inventory supply items are re-inserted so the
inventory catalog is restored to its original state. The admin's own account,
permission configuration, app settings, species/strains/rooms/recipes/process
templates, and IoT device registrations are all left intact.

## Security
- No new tables; no RLS policy changes.
- reset_app_data() is SECURITY DEFINER (runs as the migration/superuser role)
  so it can TRUNCATE regardless of the caller's privileges. It is only ever
  called from the reset-data edge function, which verifies the caller is an
  active admin before invoking it.
*/

-- 1. Expand allowed roles to include 'demo' (idempotent: drop + re-add constraint)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'lab_worker', 'production_worker', 'harvest_worker', 'viewer', 'demo'));

ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN ('admin', 'manager', 'lab_worker', 'production_worker', 'harvest_worker', 'viewer', 'demo'));

-- 2. Demo role permissions (idempotent: clear then re-seed for this role)
DELETE FROM role_permissions WHERE role = 'demo';

INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve) VALUES
  ('demo', 'dashboard',         true,  false, false, false, false),
  ('demo', 'tasks',             true,  true,  true,  false, true),
  ('demo', 'batches',           true,  true,  true,  false, true),
  ('demo', 'contamination',     true,  true,  true,  false, true),
  ('demo', 'harvests',          true,  true,  true,  false, true),
  ('demo', 'env_logs',          true,  true,  true,  false, false),
  ('demo', 'inventory',         true,  true,  true,  false, false),
  ('demo', 'rooms',             true,  true,  true,  false, false),
  ('demo', 'species_strains',   true,  true,  true,  false, false),
  ('demo', 'process_templates', true,  true,  true,  false, false),
  ('demo', 'qr_codes',          true,  true,  true,  false, false),
  ('demo', 'reports',           true,  false, false, false, false),
  ('demo', 'users',             true,  false, false, false, false),
  ('demo', 'devices',           true,  false, false, false, false);

-- 3. demo_mode app setting
INSERT INTO app_settings (key, value) VALUES
  ('demo_mode', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. reset_app_data() — clears operational data, preserves foundational catalog
CREATE OR REPLACE FUNCTION reset_app_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear all operational/test data in dependency-safe order.
  -- (TRUNCATE with multiple tables + CASCADE handles FK ordering internally.)
  TRUNCATE TABLE
    task_qr_verifications,
    qr_scan_logs,
    batch_movements,
    batch_photos,
    batch_notes,
    batch_events,
    batch_sources,
    contamination_reports,
    harvests,
    environmental_alerts,
    environmental_logs,
    inventory_audit_lines,
    inventory_audits,
    inventory_movements,
    tasks,
    notifications,
    qr_codes,
    batches,
    inventory_items
  RESTART IDENTITY CASCADE;

  -- Restore the seeded inventory supply catalog to its original state.
  INSERT INTO inventory_items (name, category, unit, current_stock, minimum_stock) VALUES
    ('Sawdust (Hardwood)', 'Substrate', 'kg', 500, 50),
    ('Wood Chips', 'Substrate', 'kg', 200, 30),
    ('Wheat Bran', 'Supplement', 'kg', 100, 20),
    ('Gypsum', 'Supplement', 'kg', 50, 10),
    ('Calcium Carbonate', 'Supplement', 'kg', 30, 5),
    ('Coco Coir', 'Substrate', 'kg', 80, 15),
    ('Straw (Wheat)', 'Substrate', 'kg', 300, 50),
    ('Grain (Rye)', 'Grain', 'kg', 200, 30),
    ('Agar (Agar-Agar Powder)', 'Lab Supply', 'g', 5000, 500),
    ('Dextrose', 'Lab Supply', 'g', 3000, 300),
    ('Petri Dish (90mm)', 'Lab Supply', 'pcs', 500, 100),
    ('Spawn Bag (Polypropylene)', 'Packaging', 'pcs', 1000, 200),
    ('Substrate Bag (Filter Patch)', 'Packaging', 'pcs', 1000, 200),
    ('Isopropyl Alcohol 70%', 'Cleaning Supply', 'L', 10, 2),
    ('Nitrile Gloves (Box)', 'Lab Supply', 'box', 20, 5),
    ('N95 / FFP2 Mask (Box)', 'Lab Supply', 'box', 10, 2);
END;
$$;
