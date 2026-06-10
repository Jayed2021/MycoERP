/*
# QR Code Tracking System

Adds a complete QR code tracking system to the mushroom cultivation ERP.

## New Tables

### `qr_codes`
Stores QR code records linked to physical entities (batches, rooms, racks, shelves, etc.).
- `id` - UUID primary key
- `qr_text` - Unique human-readable code (e.g. QR-BATCH-FB-0001)
- `entity_type` - Type of entity this QR represents (batch, location, rack, shelf, harvest_crate, checkpoint, task, other)
- `entity_id` - UUID of the linked entity
- `label` - Human-readable label printed on the QR
- `description` - Optional description
- `status` - Active | Inactive | Lost | Replaced | Archived
- `replaced_by` - Self-reference to replacement QR code
- `printed_at` - When the label was printed
- `last_scanned_at` - Timestamp of most recent scan
- `created_by` - Profile who generated the code
- Timestamps

### `qr_scan_logs`
Logs every scan attempt (successful and failed).
- `qr_code_id` - Linked QR code (null if code not found)
- `scanned_code` - Raw text that was scanned
- `entity_type` / `entity_id` - Resolved entity
- `scanned_by` - Worker who scanned
- `scanned_at` - When the scan happened
- `scan_context` - What the worker was doing (e.g. "task_verification", "batch_lookup")
- `related_task_id` - Task being worked on, if any
- `result` - Success | Invalid code | Inactive code | Unauthorized | Wrong location | Wrong entity
- `notes`

### `task_qr_verifications`
Records each QR verification event for a task requirement.
- `task_id` - The task being verified
- `qr_code_id` - Which QR code was used
- `verification_type` - batch | location | checkpoint | crate
- `verified_by` - Worker who scanned
- `verified_at` - When verified
- `expected_entity_type` / `expected_entity_id` - What was required
- `actual_entity_type` / `actual_entity_id` - What was scanned
- `result` - Matched | Wrong QR | Wrong location | Wrong batch | Expired
- `is_manager_override` - Whether a manager bypassed the requirement

### `batch_movements`
Records every physical movement of a batch, validated by QR scans.
- `batch_id` - Batch that was moved
- `from_room_id` / `to_room_id` - Source and destination rooms
- `from_rack_id` / `to_rack_id` - Optional rack level
- `moved_by` - Worker who moved
- `moved_at` - When moved
- `batch_qr_code_id` - QR scanned to confirm batch identity
- `destination_qr_code_id` - QR scanned to confirm destination
- `notes`

## Altered Tables

### `tasks`
Added QR verification requirement columns:
- `qr_required` (boolean) - Requires a batch/entity QR scan
- `qr_entity_type` (text) - What entity type the QR must match
- `qr_entity_id` (uuid) - Specific entity required (null = any of that type)
- `location_qr_required` (boolean) - Requires a location QR scan
- `checkpoint_qr_required` (boolean) - Requires a checkpoint QR scan
- `crate_qr_required` (boolean) - Requires a harvest crate QR scan

### `process_template_steps`
Same QR requirement columns added so auto-generated tasks inherit requirements.

## Security
- RLS enabled on all new tables
- All authenticated users can read QR codes and scan logs
- All authenticated users can insert scan logs and verifications (workers scan)
- Only authenticated users can create QR codes (managers/admins enforced in app logic)
- Workers cannot update or delete QR codes or scan logs (enforced in app layer via role checks)

## Notes
1. Every scan attempt (including failures) must be logged in qr_scan_logs
2. QR codes with status != 'Active' are rejected with 'Inactive code' result
3. task_qr_verifications are created per requirement per task; a task can have up to 4 verifications
4. batch_movements stores the full location change history with QR traceability
*/

-- Add QR requirement columns to tasks table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='qr_required') THEN
    ALTER TABLE tasks
      ADD COLUMN qr_required boolean NOT NULL DEFAULT false,
      ADD COLUMN qr_entity_type text,
      ADD COLUMN qr_entity_id uuid,
      ADD COLUMN location_qr_required boolean NOT NULL DEFAULT false,
      ADD COLUMN checkpoint_qr_required boolean NOT NULL DEFAULT false,
      ADD COLUMN crate_qr_required boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add QR requirement columns to process_template_steps
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='process_template_steps' AND column_name='qr_required') THEN
    ALTER TABLE process_template_steps
      ADD COLUMN qr_required boolean NOT NULL DEFAULT false,
      ADD COLUMN qr_entity_type text,
      ADD COLUMN location_qr_required boolean NOT NULL DEFAULT false,
      ADD COLUMN checkpoint_qr_required boolean NOT NULL DEFAULT false,
      ADD COLUMN crate_qr_required boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- QR Codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_text text UNIQUE NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('batch','location','rack','shelf','harvest_crate','checkpoint','task','other')),
  entity_id uuid NOT NULL,
  label text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Lost','Replaced','Archived')),
  replaced_by uuid REFERENCES qr_codes(id) ON DELETE SET NULL,
  printed_at timestamptz,
  last_scanned_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_codes_select" ON qr_codes;
CREATE POLICY "qr_codes_select" ON qr_codes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "qr_codes_insert" ON qr_codes;
CREATE POLICY "qr_codes_insert" ON qr_codes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "qr_codes_update" ON qr_codes;
CREATE POLICY "qr_codes_update" ON qr_codes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "qr_codes_delete" ON qr_codes;
CREATE POLICY "qr_codes_delete" ON qr_codes FOR DELETE TO authenticated USING (true);

-- QR Scan Logs table
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id uuid REFERENCES qr_codes(id) ON DELETE SET NULL,
  scanned_code text NOT NULL,
  entity_type text,
  entity_id uuid,
  scanned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  scanned_at timestamptz DEFAULT now(),
  scan_context text,
  related_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  related_location text,
  device_info text,
  result text NOT NULL DEFAULT 'Success' CHECK (result IN ('Success','Invalid code','Inactive code','Unauthorized','Wrong location','Wrong entity')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE qr_scan_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_scan_logs_select" ON qr_scan_logs;
CREATE POLICY "qr_scan_logs_select" ON qr_scan_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "qr_scan_logs_insert" ON qr_scan_logs;
CREATE POLICY "qr_scan_logs_insert" ON qr_scan_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "qr_scan_logs_update" ON qr_scan_logs;
CREATE POLICY "qr_scan_logs_update" ON qr_scan_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "qr_scan_logs_delete" ON qr_scan_logs;
CREATE POLICY "qr_scan_logs_delete" ON qr_scan_logs FOR DELETE TO authenticated USING (true);

-- Task QR Verifications table
CREATE TABLE IF NOT EXISTS task_qr_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  qr_code_id uuid REFERENCES qr_codes(id) ON DELETE SET NULL,
  verification_type text NOT NULL CHECK (verification_type IN ('batch','location','checkpoint','crate')),
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz DEFAULT now(),
  expected_entity_type text,
  expected_entity_id uuid,
  actual_entity_type text,
  actual_entity_id uuid,
  result text NOT NULL CHECK (result IN ('Matched','Wrong QR','Wrong location','Wrong batch','Expired')),
  is_manager_override boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_qr_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_qr_verifications_select" ON task_qr_verifications;
CREATE POLICY "task_qr_verifications_select" ON task_qr_verifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "task_qr_verifications_insert" ON task_qr_verifications;
CREATE POLICY "task_qr_verifications_insert" ON task_qr_verifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "task_qr_verifications_update" ON task_qr_verifications;
CREATE POLICY "task_qr_verifications_update" ON task_qr_verifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "task_qr_verifications_delete" ON task_qr_verifications;
CREATE POLICY "task_qr_verifications_delete" ON task_qr_verifications FOR DELETE TO authenticated USING (true);

-- Batch Movements table
CREATE TABLE IF NOT EXISTS batch_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  from_room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  to_room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  from_rack_id uuid REFERENCES racks(id) ON DELETE SET NULL,
  to_rack_id uuid REFERENCES racks(id) ON DELETE SET NULL,
  from_shelf_id uuid REFERENCES shelves(id) ON DELETE SET NULL,
  to_shelf_id uuid REFERENCES shelves(id) ON DELETE SET NULL,
  moved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  moved_at timestamptz DEFAULT now(),
  batch_qr_code_id uuid REFERENCES qr_codes(id) ON DELETE SET NULL,
  destination_qr_code_id uuid REFERENCES qr_codes(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE batch_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "batch_movements_select" ON batch_movements;
CREATE POLICY "batch_movements_select" ON batch_movements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "batch_movements_insert" ON batch_movements;
CREATE POLICY "batch_movements_insert" ON batch_movements FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "batch_movements_update" ON batch_movements;
CREATE POLICY "batch_movements_update" ON batch_movements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "batch_movements_delete" ON batch_movements;
CREATE POLICY "batch_movements_delete" ON batch_movements FOR DELETE TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_entity ON qr_codes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_text ON qr_codes(qr_text);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_at ON qr_scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_qr_code_id ON qr_scan_logs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_by ON qr_scan_logs(scanned_by);
CREATE INDEX IF NOT EXISTS idx_task_qr_verifications_task_id ON task_qr_verifications(task_id);
CREATE INDEX IF NOT EXISTS idx_batch_movements_batch_id ON batch_movements(batch_id);
