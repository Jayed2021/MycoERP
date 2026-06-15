/*
# Inventory Barcode & Audit System

## Changes to Existing Tables
- `inventory_items` - Add barcode_text column for QR code identification

## New Tables
- `inventory_audits` - Audit session records with status tracking
- `inventory_audit_lines` - Per-item audit count results with discrepancy tracking
*/

-- Add barcode_text to inventory_items
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode_text text UNIQUE;

-- INVENTORY AUDITS
CREATE TABLE IF NOT EXISTS inventory_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  audit_date timestamptz DEFAULT now(),
  conducted_by uuid REFERENCES profiles(id),
  status text DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Completed', 'Cancelled')),
  notes text,
  total_items int DEFAULT 0,
  items_counted int DEFAULT 0,
  discrepancies_found int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_audits_select" ON inventory_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_audits_insert" ON inventory_audits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inventory_audits_update" ON inventory_audits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inventory_audits_delete" ON inventory_audits FOR DELETE TO authenticated USING (true);

-- INVENTORY AUDIT LINES
CREATE TABLE IF NOT EXISTS inventory_audit_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES inventory_audits(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id),
  expected_stock numeric NOT NULL DEFAULT 0,
  counted_stock numeric,
  discrepancy numeric,
  counted_by uuid REFERENCES profiles(id),
  counted_at timestamptz,
  notes text,
  adjustment_applied boolean DEFAULT false
);

ALTER TABLE inventory_audit_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_audit_lines_select" ON inventory_audit_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_audit_lines_insert" ON inventory_audit_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inventory_audit_lines_update" ON inventory_audit_lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inventory_audit_lines_delete" ON inventory_audit_lines FOR DELETE TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_audits_status ON inventory_audits(status);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_lines_audit_id ON inventory_audit_lines(audit_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_lines_item_id ON inventory_audit_lines(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode_text ON inventory_items(barcode_text) WHERE barcode_text IS NOT NULL;