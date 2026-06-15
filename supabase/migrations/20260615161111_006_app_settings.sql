/*
# App Settings Table

Creates a system-wide key-value configuration store for application settings.
The primary use case is label/barcode size configuration per batch type,
but the table supports any JSON-serializable settings.

## New Tables

### app_settings
- `key` (text, primary key) - Setting identifier (e.g., 'label_sizes', 'general')
- `value` (jsonb, not null) - JSON configuration value
- `updated_at` (timestamptz) - When the setting was last modified
- `updated_by` (uuid, nullable) - Who last changed this setting

## Security
- RLS enabled
- All authenticated users can SELECT (read settings for label rendering)
- Only admins can INSERT/UPDATE/DELETE (modify settings)

## Seed Data
- `label_sizes` - Default label dimensions per batch type:
  - agar: 1.5" x 1"
  - liquid_culture: 1.5" x 1"
  - grain_spawn: 2" x 1.5"
  - substrate: 2.5" x 1.5"
  - fruiting_block: 2.5" x 1.5"
  - harvest: 2.5" x 1.5"
  - default: 2" x 1.25"
- `label_fields` - Which fields to show on printed labels
- `general` - General app settings placeholder

## Notes
1. Uses text primary key (no uuid) since settings are identified by name
2. JSONB allows flexible schema per setting without migrations
3. Label sizes stored in inches; frontend converts to pixels at 300 DPI for print
*/

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
DROP POLICY IF EXISTS "app_settings_select" ON app_settings;
CREATE POLICY "app_settings_select" ON app_settings FOR SELECT
  TO authenticated USING (true);

-- Only admins can insert settings
DROP POLICY IF EXISTS "app_settings_insert" ON app_settings;
CREATE POLICY "app_settings_insert" ON app_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can update settings
DROP POLICY IF EXISTS "app_settings_update" ON app_settings;
CREATE POLICY "app_settings_update" ON app_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Only admins can delete settings
DROP POLICY IF EXISTS "app_settings_delete" ON app_settings;
CREATE POLICY "app_settings_delete" ON app_settings FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed default label sizes
INSERT INTO app_settings (key, value) VALUES
  ('label_sizes', '{
    "agar": { "width": 1.5, "height": 1, "qr_size": 80, "layout": "horizontal" },
    "liquid_culture": { "width": 1.5, "height": 1, "qr_size": 80, "layout": "horizontal" },
    "grain_spawn": { "width": 2, "height": 1.5, "qr_size": 120, "layout": "horizontal" },
    "substrate": { "width": 2.5, "height": 1.5, "qr_size": 140, "layout": "horizontal" },
    "fruiting_block": { "width": 2.5, "height": 1.5, "qr_size": 140, "layout": "horizontal" },
    "harvest": { "width": 2.5, "height": 1.5, "qr_size": 140, "layout": "horizontal" },
    "default": { "width": 2, "height": 1.25, "qr_size": 100, "layout": "horizontal" }
  }'::jsonb),
  ('label_fields', '{
    "show_batch_code": true,
    "show_batch_type": true,
    "show_species": true,
    "show_strain": true,
    "show_date": true,
    "show_room": false,
    "show_responsible": false,
    "error_correction": "M"
  }'::jsonb),
  ('general', '{
    "farm_name": "MycoERP Farm",
    "auto_generate_qr_on_batch_create": true
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
