export type UserRole = 'admin' | 'manager' | 'lab_worker' | 'production_worker' | 'harvest_worker' | 'viewer';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Species {
  id: string;
  name: string;
  scientific_name: string | null;
  description: string | null;
  default_incubation_days: number | null;
  default_fruiting_days: number | null;
  default_harvest_window_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Strain {
  id: string;
  species_id: string | null;
  strain_code: string;
  strain_name: string | null;
  source: string | null;
  date_acquired: string | null;
  storage_method: string | null;
  expected_colonization_days: number | null;
  expected_fruiting_days: number | null;
  expected_yield_notes: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  species?: Species;
}

export interface Room {
  id: string;
  name: string;
  room_type: string;
  capacity: number | null;
  temp_min: number | null;
  temp_max: number | null;
  humidity_min: number | null;
  humidity_max: number | null;
  co2_max: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rack {
  id: string;
  room_id: string | null;
  name: string;
  shelf_count: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  room?: Room;
}

export interface Shelf {
  id: string;
  rack_id: string | null;
  name: string;
  capacity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  suitable_species_id: string | null;
  substrate_type: string | null;
  process_method: string | null;
  target_moisture_percent: number | null;
  expected_colonization_days: number | null;
  expected_yield_notes: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  species?: Species;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  percentage: number | null;
  notes: string | null;
  created_at: string;
}

export interface ProcessTemplate {
  id: string;
  name: string;
  batch_type: string;
  species_id: string | null;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  species?: Species;
  steps?: ProcessTemplateStep[];
}

export interface ProcessTemplateStep {
  id: string;
  template_id: string;
  step_order: number;
  title: string;
  description: string | null;
  day_offset: number;
  due_time: string | null;
  assigned_role: string | null;
  assigned_department: string | null;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  photo_required: boolean;
  approval_required: boolean;
  target_stage: string | null;
  target_status: string | null;
  created_at: string;
}

export type BatchType = 'agar' | 'liquid_culture' | 'grain_spawn' | 'substrate' | 'fruiting_block' | 'harvest' | 'other';

export interface Batch {
  id: string;
  batch_code: string;
  batch_type: BatchType;
  species_id: string | null;
  strain_id: string | null;
  recipe_id: string | null;
  current_stage: string | null;
  status: string;
  health_status: string;
  quantity: number;
  unit: string;
  room_id: string | null;
  rack_id: string | null;
  shelf_id: string | null;
  start_date: string | null;
  expected_ready_date: string | null;
  actual_ready_date: string | null;
  responsible_user_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  species?: Species;
  strain?: Strain;
  recipe?: Recipe;
  room?: Room;
  responsible_user?: Profile;
}

export interface BatchSource {
  id: string;
  child_batch_id: string;
  source_batch_id: string;
  relationship_type: string | null;
  notes: string | null;
  created_at: string;
  source_batch?: Batch;
  child_batch?: Batch;
}

export interface BatchEvent {
  id: string;
  batch_id: string;
  event_type: string;
  title: string;
  description: string | null;
  related_task_id: string | null;
  created_by: string | null;
  created_at: string;
  creator?: Profile;
}

export interface BatchNote {
  id: string;
  batch_id: string;
  task_id: string | null;
  note: string;
  created_by: string | null;
  created_at: string;
  creator?: Profile;
}

export interface BatchPhoto {
  id: string;
  batch_id: string;
  task_id: string | null;
  photo_url: string;
  caption: string | null;
  photo_type: string;
  uploaded_by: string | null;
  created_at: string;
  uploader?: Profile;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string | null;
  batch_id: string | null;
  assigned_to: string | null;
  assigned_role: string | null;
  department: string | null;
  due_at: string;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  status: string;
  photo_required: boolean;
  approval_required: boolean;
  completed_by: string | null;
  completed_at: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  photo_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  batch?: Batch;
  assignee?: Profile;
  completer?: Profile;
  approver?: Profile;
}

export interface ContaminationReport {
  id: string;
  batch_id: string;
  batch_type: string | null;
  stage: string | null;
  observed_at: string;
  reported_by: string | null;
  affected_quantity: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  suspected_type: string | null;
  suspected_cause: string | null;
  action_taken: string | null;
  photo_url: string | null;
  manager_note: string | null;
  status: 'Open' | 'Reviewed' | 'Resolved' | 'Closed';
  created_at: string;
  updated_at: string;
  batch?: Batch;
  reporter?: Profile;
}

export interface Harvest {
  id: string;
  harvest_code: string;
  fruiting_batch_id: string | null;
  species_id: string | null;
  strain_id: string | null;
  flush_number: number;
  harvested_at: string;
  gross_weight: number;
  grade_a_weight: number;
  grade_b_weight: number;
  waste_weight: number;
  harvested_by: string | null;
  approved_by: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  batch?: Batch;
  species?: Species;
  strain?: Strain;
  harvester?: Profile;
}

export interface EnvironmentalLog {
  id: string;
  room_id: string | null;
  logged_at: string;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
  light_status: string | null;
  fan_status: string | null;
  humidifier_status: string | null;
  notes: string | null;
  logged_by: string | null;
  device_id: string | null;
  source: 'manual' | 'iot';
  created_at: string;
  room?: Room;
  logger?: Profile;
  device?: IoTDevice;
}

export type IoTDeviceType = 'esp32' | 'rpi' | 'other';

export interface IoTDevice {
  id: string;
  device_name: string;
  room_id: string | null;
  device_type: IoTDeviceType;
  api_key_hash: string;
  reporting_interval_seconds: number;
  last_seen_at: string | null;
  firmware_version: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  room?: Room;
}

export type AlertType = 'temp_high' | 'temp_low' | 'humidity_high' | 'humidity_low' | 'co2_high';

export interface EnvironmentalAlert {
  id: string;
  room_id: string | null;
  device_id: string | null;
  alert_type: AlertType;
  measured_value: number;
  threshold_value: number;
  auto_task_id: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  room?: Room;
  device?: IoTDevice;
  acknowledger?: Profile;
  task?: Task;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  cost_per_unit: number | null;
  supplier: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  movement_type: 'Stock In' | 'Stock Out' | 'Used in Batch' | 'Adjustment' | 'Waste';
  quantity: number;
  unit: string | null;
  related_batch_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  item?: InventoryItem;
  creator?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  notification_type: string | null;
  related_task_id: string | null;
  related_batch_id: string | null;
  read_at: string | null;
  created_at: string;
}

export type QrEntityType = 'batch' | 'location' | 'rack' | 'shelf' | 'harvest_crate' | 'checkpoint' | 'task' | 'other';
export type QrStatus = 'Active' | 'Inactive' | 'Lost' | 'Replaced' | 'Archived';
export type QrScanResult = 'Success' | 'Invalid code' | 'Inactive code' | 'Unauthorized' | 'Wrong location' | 'Wrong entity';
export type QrVerificationResult = 'Matched' | 'Wrong QR' | 'Wrong location' | 'Wrong batch' | 'Expired';
export type QrVerificationType = 'batch' | 'location' | 'checkpoint' | 'crate';

export interface QrCode {
  id: string;
  qr_text: string;
  entity_type: QrEntityType;
  entity_id: string;
  label: string;
  description: string | null;
  status: QrStatus;
  replaced_by: string | null;
  printed_at: string | null;
  last_scanned_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile;
}

export interface QrScanLog {
  id: string;
  qr_code_id: string | null;
  scanned_code: string;
  entity_type: string | null;
  entity_id: string | null;
  scanned_by: string | null;
  scanned_at: string;
  scan_context: string | null;
  related_task_id: string | null;
  related_location: string | null;
  device_info: string | null;
  result: QrScanResult;
  notes: string | null;
  created_at: string;
  scanner?: Profile;
  qr_code?: QrCode;
}

export interface TaskQrVerification {
  id: string;
  task_id: string;
  qr_code_id: string | null;
  verification_type: QrVerificationType;
  verified_by: string | null;
  verified_at: string;
  expected_entity_type: string | null;
  expected_entity_id: string | null;
  actual_entity_type: string | null;
  actual_entity_id: string | null;
  result: QrVerificationResult;
  is_manager_override: boolean;
  notes: string | null;
  created_at: string;
  verifier?: Profile;
  qr_code?: QrCode;
}

export interface BatchMovement {
  id: string;
  batch_id: string;
  from_room_id: string | null;
  to_room_id: string | null;
  from_rack_id: string | null;
  to_rack_id: string | null;
  from_shelf_id: string | null;
  to_shelf_id: string | null;
  moved_by: string | null;
  moved_at: string;
  batch_qr_code_id: string | null;
  destination_qr_code_id: string | null;
  notes: string | null;
  created_at: string;
  mover?: Profile;
  from_room?: Room;
  to_room?: Room;
}

// Extended Task with QR fields
export interface TaskWithQr extends Task {
  qr_required: boolean;
  qr_entity_type: string | null;
  qr_entity_id: string | null;
  location_qr_required: boolean;
  checkpoint_qr_required: boolean;
  crate_qr_required: boolean;
}
