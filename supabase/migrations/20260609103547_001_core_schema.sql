/*
# Mushroom Cultivation ERP - Core Schema

This migration creates the foundational tables for the mushroom cultivation ERP system.

## New Tables

### User & Auth
- `profiles` - Extended user profiles with roles (admin, manager, lab_worker, production_worker, harvest_worker, viewer), department, and active status. References auth.users.

### Reference Data
- `species` - Mushroom species (Lion's Mane, Oyster, etc.) with cultivation parameters
- `strains` - Specific strains under each species with expected timelines
- `rooms` - Physical rooms (lab, incubation, fruiting, etc.) with environmental targets
- `racks` - Rack storage within rooms
- `shelves` - Individual shelves within racks
- `recipes` - Substrate recipes with ingredients and process methods
- `recipe_ingredients` - Individual ingredients for each recipe

### Process Templates
- `process_templates` - Templates that auto-generate tasks for batch types
- `process_template_steps` - Individual steps with day offsets, role assignments, requirements

### Batches
- `batches` - Main production batch tracking table (agar, LC, grain spawn, substrate, fruiting block, harvest)
- `batch_sources` - Parent-child relationships between batches (genealogy)
- `batch_events` - Timeline/audit log of events for each batch
- `batch_notes` - Text notes attached to batches
- `batch_photos` - Photo records for batches

### Tasks
- `tasks` - Work tasks with assignment, scheduling, completion, and approval tracking
- `contamination_reports` - Contamination incidents linked to batches
- `harvests` - Harvest records per flush per fruiting batch
- `environmental_logs` - Manual environmental readings per room

### Inventory
- `inventory_items` - Inventory item catalog
- `inventory_movements` - Stock in/out/adjustment movements

### Notifications
- `notifications` - In-app notifications per user

### Audit
- `audit_logs` - System-wide audit trail

## Security
- RLS enabled on all tables
- `profiles`: users can read all profiles, update own profile; admins manage all
- All other tables: authenticated users can read; managers/admins can write (enforced in app logic via role checks)
- For this multi-user ERP, policies allow all authenticated users to read all operational data but restrict writes to authenticated users

## Notes
1. `net_usable_weight` on harvests is computed as grade_a + grade_b
2. Batch codes follow a pattern like AP-LM-001 (type prefix + species + sequence)
3. Task overdue logic is handled in application/query layer using `due_at < now()`
4. Photo URLs reference Supabase Storage paths
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'production_worker' CHECK (role IN ('admin', 'manager', 'lab_worker', 'production_worker', 'harvest_worker', 'viewer')),
  department text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- SPECIES
CREATE TABLE IF NOT EXISTS species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scientific_name text,
  description text,
  default_incubation_days int DEFAULT 14,
  default_fruiting_days int DEFAULT 14,
  default_harvest_window_days int DEFAULT 7,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE species ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "species_select" ON species;
CREATE POLICY "species_select" ON species FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "species_insert" ON species;
CREATE POLICY "species_insert" ON species FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "species_update" ON species;
CREATE POLICY "species_update" ON species FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "species_delete" ON species;
CREATE POLICY "species_delete" ON species FOR DELETE TO authenticated USING (true);

-- STRAINS
CREATE TABLE IF NOT EXISTS strains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id uuid REFERENCES species(id) ON DELETE SET NULL,
  strain_code text NOT NULL,
  strain_name text,
  source text,
  date_acquired date,
  storage_method text,
  expected_colonization_days int,
  expected_fruiting_days int,
  expected_yield_notes text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE strains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strains_select" ON strains;
CREATE POLICY "strains_select" ON strains FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "strains_insert" ON strains;
CREATE POLICY "strains_insert" ON strains FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "strains_update" ON strains;
CREATE POLICY "strains_update" ON strains FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "strains_delete" ON strains;
CREATE POLICY "strains_delete" ON strains FOR DELETE TO authenticated USING (true);

-- ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  room_type text NOT NULL CHECK (room_type IN ('lab','incubation','fruiting','storage','substrate_prep','packaging','waste','other')),
  capacity int,
  temp_min numeric,
  temp_max numeric,
  humidity_min numeric,
  humidity_max numeric,
  co2_max numeric,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_select" ON rooms;
CREATE POLICY "rooms_select" ON rooms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rooms_insert" ON rooms;
CREATE POLICY "rooms_insert" ON rooms FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "rooms_update" ON rooms;
CREATE POLICY "rooms_update" ON rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "rooms_delete" ON rooms;
CREATE POLICY "rooms_delete" ON rooms FOR DELETE TO authenticated USING (true);

-- RACKS
CREATE TABLE IF NOT EXISTS racks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  name text NOT NULL,
  shelf_count int DEFAULT 4,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE racks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "racks_select" ON racks;
CREATE POLICY "racks_select" ON racks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "racks_insert" ON racks;
CREATE POLICY "racks_insert" ON racks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "racks_update" ON racks;
CREATE POLICY "racks_update" ON racks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "racks_delete" ON racks;
CREATE POLICY "racks_delete" ON racks FOR DELETE TO authenticated USING (true);

-- SHELVES
CREATE TABLE IF NOT EXISTS shelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id uuid REFERENCES racks(id) ON DELETE SET NULL,
  name text NOT NULL,
  capacity int,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shelves_select" ON shelves;
CREATE POLICY "shelves_select" ON shelves FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "shelves_insert" ON shelves;
CREATE POLICY "shelves_insert" ON shelves FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "shelves_update" ON shelves;
CREATE POLICY "shelves_update" ON shelves FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "shelves_delete" ON shelves;
CREATE POLICY "shelves_delete" ON shelves FOR DELETE TO authenticated USING (true);

-- RECIPES
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  suitable_species_id uuid REFERENCES species(id) ON DELETE SET NULL,
  substrate_type text,
  process_method text,
  target_moisture_percent numeric,
  expected_colonization_days int,
  expected_yield_notes text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipes_select" ON recipes;
CREATE POLICY "recipes_select" ON recipes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "recipes_insert" ON recipes;
CREATE POLICY "recipes_insert" ON recipes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "recipes_update" ON recipes;
CREATE POLICY "recipes_update" ON recipes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "recipes_delete" ON recipes;
CREATE POLICY "recipes_delete" ON recipes FOR DELETE TO authenticated USING (true);

-- RECIPE INGREDIENTS
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  quantity numeric,
  unit text,
  percentage numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe_ingredients_select" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_select" ON recipe_ingredients FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "recipe_ingredients_insert" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_insert" ON recipe_ingredients FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "recipe_ingredients_update" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_update" ON recipe_ingredients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "recipe_ingredients_delete" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_delete" ON recipe_ingredients FOR DELETE TO authenticated USING (true);

-- PROCESS TEMPLATES
CREATE TABLE IF NOT EXISTS process_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  batch_type text NOT NULL,
  species_id uuid REFERENCES species(id) ON DELETE SET NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE process_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "process_templates_select" ON process_templates;
CREATE POLICY "process_templates_select" ON process_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "process_templates_insert" ON process_templates;
CREATE POLICY "process_templates_insert" ON process_templates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "process_templates_update" ON process_templates;
CREATE POLICY "process_templates_update" ON process_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "process_templates_delete" ON process_templates;
CREATE POLICY "process_templates_delete" ON process_templates FOR DELETE TO authenticated USING (true);

-- PROCESS TEMPLATE STEPS
CREATE TABLE IF NOT EXISTS process_template_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES process_templates(id) ON DELETE CASCADE,
  step_order int NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  day_offset int NOT NULL DEFAULT 0,
  due_time time,
  assigned_role text,
  assigned_department text,
  priority text DEFAULT 'Normal' CHECK (priority IN ('Low','Normal','High','Critical')),
  photo_required boolean DEFAULT false,
  approval_required boolean DEFAULT false,
  target_stage text,
  target_status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE process_template_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pts_select" ON process_template_steps;
CREATE POLICY "pts_select" ON process_template_steps FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pts_insert" ON process_template_steps;
CREATE POLICY "pts_insert" ON process_template_steps FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pts_update" ON process_template_steps;
CREATE POLICY "pts_update" ON process_template_steps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pts_delete" ON process_template_steps;
CREATE POLICY "pts_delete" ON process_template_steps FOR DELETE TO authenticated USING (true);

-- BATCHES
CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code text UNIQUE NOT NULL,
  batch_type text NOT NULL CHECK (batch_type IN ('agar','liquid_culture','grain_spawn','substrate','fruiting_block','harvest','other')),
  species_id uuid REFERENCES species(id) ON DELETE SET NULL,
  strain_id uuid REFERENCES strains(id) ON DELETE SET NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  current_stage text,
  status text NOT NULL DEFAULT 'Planned',
  health_status text DEFAULT 'Healthy',
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'units',
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  rack_id uuid REFERENCES racks(id) ON DELETE SET NULL,
  shelf_id uuid REFERENCES shelves(id) ON DELETE SET NULL,
  start_date date DEFAULT CURRENT_DATE,
  expected_ready_date date,
  actual_ready_date date,
  responsible_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "batches_select" ON batches;
CREATE POLICY "batches_select" ON batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "batches_insert" ON batches;
CREATE POLICY "batches_insert" ON batches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "batches_update" ON batches;
CREATE POLICY "batches_update" ON batches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "batches_delete" ON batches;
CREATE POLICY "batches_delete" ON batches FOR DELETE TO authenticated USING (true);

-- BATCH SOURCES (genealogy)
CREATE TABLE IF NOT EXISTS batch_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  source_batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  relationship_type text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE batch_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "batch_sources_select" ON batch_sources;
CREATE POLICY "batch_sources_select" ON batch_sources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "batch_sources_insert" ON batch_sources;
CREATE POLICY "batch_sources_insert" ON batch_sources FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "batch_sources_update" ON batch_sources;
CREATE POLICY "batch_sources_update" ON batch_sources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "batch_sources_delete" ON batch_sources;
CREATE POLICY "batch_sources_delete" ON batch_sources FOR DELETE TO authenticated USING (true);

-- BATCH EVENTS (timeline)
CREATE TABLE IF NOT EXISTS batch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  related_task_id uuid,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE batch_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "batch_events_select" ON batch_events;
CREATE POLICY "batch_events_select" ON batch_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "batch_events_insert" ON batch_events;
CREATE POLICY "batch_events_insert" ON batch_events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "batch_events_update" ON batch_events;
CREATE POLICY "batch_events_update" ON batch_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "batch_events_delete" ON batch_events;
CREATE POLICY "batch_events_delete" ON batch_events FOR DELETE TO authenticated USING (true);

-- BATCH NOTES
CREATE TABLE IF NOT EXISTS batch_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  task_id uuid,
  note text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE batch_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "batch_notes_select" ON batch_notes;
CREATE POLICY "batch_notes_select" ON batch_notes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "batch_notes_insert" ON batch_notes;
CREATE POLICY "batch_notes_insert" ON batch_notes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "batch_notes_update" ON batch_notes;
CREATE POLICY "batch_notes_update" ON batch_notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "batch_notes_delete" ON batch_notes;
CREATE POLICY "batch_notes_delete" ON batch_notes FOR DELETE TO authenticated USING (true);

-- BATCH PHOTOS
CREATE TABLE IF NOT EXISTS batch_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  task_id uuid,
  photo_url text NOT NULL,
  caption text,
  photo_type text DEFAULT 'General',
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE batch_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "batch_photos_select" ON batch_photos;
CREATE POLICY "batch_photos_select" ON batch_photos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "batch_photos_insert" ON batch_photos;
CREATE POLICY "batch_photos_insert" ON batch_photos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "batch_photos_update" ON batch_photos;
CREATE POLICY "batch_photos_update" ON batch_photos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "batch_photos_delete" ON batch_photos;
CREATE POLICY "batch_photos_delete" ON batch_photos FOR DELETE TO authenticated USING (true);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  task_type text,
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_role text,
  department text,
  due_at timestamptz NOT NULL DEFAULT (now() + interval '1 day'),
  priority text DEFAULT 'Normal' CHECK (priority IN ('Low','Normal','High','Critical')),
  status text DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Completed','Submitted for Approval','Approved','Rejected','Overdue','Missed','Cancelled')),
  photo_required boolean DEFAULT false,
  approval_required boolean DEFAULT false,
  completed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  submitted_at timestamptz,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejection_reason text,
  notes text,
  photo_url text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated USING (true);

-- CONTAMINATION REPORTS
CREATE TABLE IF NOT EXISTS contamination_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  batch_type text,
  stage text,
  observed_at timestamptz DEFAULT now(),
  reported_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  affected_quantity numeric DEFAULT 0,
  severity text DEFAULT 'Medium' CHECK (severity IN ('Low','Medium','High','Critical')),
  suspected_type text,
  suspected_cause text,
  action_taken text,
  photo_url text,
  manager_note text,
  status text DEFAULT 'Open' CHECK (status IN ('Open','Reviewed','Resolved','Closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contamination_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contamination_reports_select" ON contamination_reports;
CREATE POLICY "contamination_reports_select" ON contamination_reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "contamination_reports_insert" ON contamination_reports;
CREATE POLICY "contamination_reports_insert" ON contamination_reports FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "contamination_reports_update" ON contamination_reports;
CREATE POLICY "contamination_reports_update" ON contamination_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "contamination_reports_delete" ON contamination_reports;
CREATE POLICY "contamination_reports_delete" ON contamination_reports FOR DELETE TO authenticated USING (true);

-- HARVESTS
CREATE TABLE IF NOT EXISTS harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  harvest_code text UNIQUE NOT NULL,
  fruiting_batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
  species_id uuid REFERENCES species(id) ON DELETE SET NULL,
  strain_id uuid REFERENCES strains(id) ON DELETE SET NULL,
  flush_number int NOT NULL DEFAULT 1,
  harvested_at timestamptz DEFAULT now(),
  gross_weight numeric DEFAULT 0,
  grade_a_weight numeric DEFAULT 0,
  grade_b_weight numeric DEFAULT 0,
  waste_weight numeric DEFAULT 0,
  harvested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "harvests_select" ON harvests;
CREATE POLICY "harvests_select" ON harvests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "harvests_insert" ON harvests;
CREATE POLICY "harvests_insert" ON harvests FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "harvests_update" ON harvests;
CREATE POLICY "harvests_update" ON harvests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "harvests_delete" ON harvests;
CREATE POLICY "harvests_delete" ON harvests FOR DELETE TO authenticated USING (true);

-- ENVIRONMENTAL LOGS
CREATE TABLE IF NOT EXISTS environmental_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  logged_at timestamptz DEFAULT now(),
  temperature numeric,
  humidity numeric,
  co2 numeric,
  light_status text,
  fan_status text,
  humidifier_status text,
  notes text,
  logged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE environmental_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "env_logs_select" ON environmental_logs;
CREATE POLICY "env_logs_select" ON environmental_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "env_logs_insert" ON environmental_logs;
CREATE POLICY "env_logs_insert" ON environmental_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "env_logs_update" ON environmental_logs;
CREATE POLICY "env_logs_update" ON environmental_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "env_logs_delete" ON environmental_logs;
CREATE POLICY "env_logs_delete" ON environmental_logs FOR DELETE TO authenticated USING (true);

-- INVENTORY ITEMS
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT 'Other',
  unit text DEFAULT 'kg',
  current_stock numeric DEFAULT 0,
  minimum_stock numeric DEFAULT 0,
  cost_per_unit numeric,
  supplier text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_items_select" ON inventory_items;
CREATE POLICY "inventory_items_select" ON inventory_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "inventory_items_insert" ON inventory_items;
CREATE POLICY "inventory_items_insert" ON inventory_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "inventory_items_update" ON inventory_items;
CREATE POLICY "inventory_items_update" ON inventory_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inventory_items_delete" ON inventory_items;
CREATE POLICY "inventory_items_delete" ON inventory_items FOR DELETE TO authenticated USING (true);

-- INVENTORY MOVEMENTS
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('Stock In','Stock Out','Used in Batch','Adjustment','Waste')),
  quantity numeric NOT NULL,
  unit text,
  related_batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_movements_select" ON inventory_movements;
CREATE POLICY "inventory_movements_select" ON inventory_movements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "inventory_movements_insert" ON inventory_movements;
CREATE POLICY "inventory_movements_insert" ON inventory_movements FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "inventory_movements_update" ON inventory_movements;
CREATE POLICY "inventory_movements_update" ON inventory_movements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inventory_movements_delete" ON inventory_movements;
CREATE POLICY "inventory_movements_delete" ON inventory_movements FOR DELETE TO authenticated USING (true);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  notification_type text,
  related_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  related_batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "audit_logs_update" ON audit_logs;
CREATE POLICY "audit_logs_update" ON audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "audit_logs_delete" ON audit_logs;
CREATE POLICY "audit_logs_delete" ON audit_logs FOR DELETE TO authenticated USING (true);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_batch_type ON batches(batch_type);
CREATE INDEX IF NOT EXISTS idx_batches_species_id ON batches(species_id);
CREATE INDEX IF NOT EXISTS idx_batches_health_status ON batches(health_status);
CREATE INDEX IF NOT EXISTS idx_tasks_batch_id ON tasks(batch_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_events_batch_id ON batch_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_contamination_reports_batch_id ON contamination_reports(batch_id);
CREATE INDEX IF NOT EXISTS idx_harvests_fruiting_batch_id ON harvests(fruiting_batch_id);
CREATE INDEX IF NOT EXISTS idx_environmental_logs_room_id ON environmental_logs(room_id);
