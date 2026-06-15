/*
# IoT Sensor System

Adds IoT device management and environmental alerting to the mushroom cultivation ERP.

## New Tables

### `iot_devices`
Registered sensor devices that push data to the system.
- `id` - UUID primary key
- `device_name` - Human-readable name
- `room_id` - Room this device monitors
- `device_type` - Hardware type (esp32, rpi, other)
- `api_key_hash` - SHA256 hash of the device API key for validation
- `reporting_interval_seconds` - Expected interval between readings (default 900 = 15min)
- `last_seen_at` - Last time a reading was received
- `firmware_version` - Reported firmware version
- `is_active` - Whether device is active
- Timestamps

### `environmental_alerts`
Threshold breach alerts with optional auto-generated task links.
- `id` - UUID primary key
- `room_id` - Room where alert occurred
- `device_id` - Device that triggered the alert
- `alert_type` - Type of breach (temp_high, temp_low, humidity_high, humidity_low, co2_high)
- `measured_value` - The value that triggered the alert
- `threshold_value` - The threshold that was breached
- `auto_task_id` - Auto-generated investigation task
- `acknowledged_by` - Manager who acknowledged
- `acknowledged_at` - When acknowledged
- `resolved_at` - When resolved (linked task completed)
- Timestamps

## Altered Tables

### `environmental_logs`
- Added `device_id` (nullable) - links reading to IoT device
- Added `source` - 'manual' or 'iot' (defaults to 'manual')

## Security
- RLS enabled on all new tables
- All authenticated users can read devices and alerts
- Only authenticated users can insert/update (admin enforcement in app layer)
*/

-- IoT Devices table
CREATE TABLE IF NOT EXISTS iot_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name text NOT NULL,
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  device_type text NOT NULL DEFAULT 'esp32' CHECK (device_type IN ('esp32', 'rpi', 'other')),
  api_key_hash text UNIQUE NOT NULL,
  reporting_interval_seconds int NOT NULL DEFAULT 900,
  last_seen_at timestamptz,
  firmware_version text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE iot_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iot_devices_select" ON iot_devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "iot_devices_insert" ON iot_devices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "iot_devices_update" ON iot_devices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "iot_devices_delete" ON iot_devices FOR DELETE TO authenticated USING (true);

-- Environmental Alerts table
CREATE TABLE IF NOT EXISTS environmental_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  device_id uuid REFERENCES iot_devices(id) ON DELETE SET NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('temp_high', 'temp_low', 'humidity_high', 'humidity_low', 'co2_high')),
  measured_value numeric NOT NULL,
  threshold_value numeric NOT NULL,
  auto_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  acknowledged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE environmental_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "env_alerts_select" ON environmental_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "env_alerts_insert" ON environmental_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "env_alerts_update" ON environmental_alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "env_alerts_delete" ON environmental_alerts FOR DELETE TO authenticated USING (true);

-- Add device_id and source columns to environmental_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='environmental_logs' AND column_name='device_id') THEN
    ALTER TABLE environmental_logs
      ADD COLUMN device_id uuid REFERENCES iot_devices(id) ON DELETE SET NULL,
      ADD COLUMN source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'iot'));
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_iot_devices_room_id ON iot_devices(room_id);
CREATE INDEX IF NOT EXISTS idx_iot_devices_api_key_hash ON iot_devices(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_iot_devices_last_seen ON iot_devices(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_environmental_alerts_room_id ON environmental_alerts(room_id);
CREATE INDEX IF NOT EXISTS idx_environmental_alerts_resolved ON environmental_alerts(resolved_at);
CREATE INDEX IF NOT EXISTS idx_environmental_alerts_created ON environmental_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_environmental_logs_source ON environmental_logs(source);
CREATE INDEX IF NOT EXISTS idx_environmental_logs_device_id ON environmental_logs(device_id);
