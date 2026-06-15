export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isOverdue(dueAt: string, status: string): boolean {
  if (['Completed', 'Approved', 'Cancelled'].includes(status)) return false;
  return new Date(dueAt) < new Date();
}

export function getOverdueDuration(dueAt: string): string {
  const diff = Date.now() - new Date(dueAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m overdue`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h overdue`;
  const days = Math.floor(hours / 24);
  return `${days}d overdue`;
}

export function getBatchTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    agar: 'Agar Culture',
    liquid_culture: 'Liquid Culture',
    grain_spawn: 'Grain Spawn',
    substrate: 'Substrate',
    fruiting_block: 'Fruiting Block',
    harvest: 'Harvest',
    other: 'Other',
  };
  return labels[type] ?? type;
}

export function getBatchTypePrefix(type: string): string {
  const prefixes: Record<string, string> = {
    agar: 'AP',
    liquid_culture: 'LC',
    grain_spawn: 'GS',
    substrate: 'SB',
    fruiting_block: 'FB',
    harvest: 'HV',
    other: 'OT',
  };
  return prefixes[type] ?? 'XX';
}

export function generateBatchCode(type: string, seq: number): string {
  const prefix = getBatchTypePrefix(type);
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Admin',
    manager: 'Farm Manager',
    lab_worker: 'Lab Worker',
    production_worker: 'Production Worker',
    harvest_worker: 'Harvest Worker',
    viewer: 'Viewer',
  };
  return labels[role] ?? role;
}

export function getRoomTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    lab: 'Lab',
    incubation: 'Incubation Room',
    fruiting: 'Fruiting Room',
    storage: 'Storage Room',
    substrate_prep: 'Substrate Prep',
    packaging: 'Packaging Area',
    waste: 'Waste Area',
    other: 'Other',
  };
  return labels[type] ?? type;
}

export function getHealthStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Healthy': 'bg-emerald-100 text-emerald-800',
    'Needs Inspection': 'bg-amber-100 text-amber-800',
    'Delayed': 'bg-orange-100 text-orange-800',
    'Partially Contaminated': 'bg-red-100 text-red-800',
    'Contaminated': 'bg-red-200 text-red-900',
    'Discarded': 'bg-gray-200 text-gray-600',
    'Closed': 'bg-gray-100 text-gray-600',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-600';
}

export function getTaskStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Pending': 'bg-slate-100 text-slate-700',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-emerald-100 text-emerald-800',
    'Submitted for Approval': 'bg-violet-100 text-violet-800',
    'Approved': 'bg-emerald-100 text-emerald-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Overdue': 'bg-red-100 text-red-800',
    'Missed': 'bg-red-200 text-red-900',
    'Cancelled': 'bg-gray-100 text-gray-500',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-600';
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'Low': 'bg-slate-100 text-slate-600',
    'Normal': 'bg-blue-50 text-blue-700',
    'High': 'bg-orange-100 text-orange-700',
    'Critical': 'bg-red-100 text-red-700',
  };
  return colors[priority] ?? 'bg-gray-100 text-gray-600';
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    'Low': 'bg-amber-50 text-amber-700',
    'Medium': 'bg-orange-100 text-orange-700',
    'High': 'bg-red-100 text-red-700',
    'Critical': 'bg-red-200 text-red-900',
  };
  return colors[severity] ?? 'bg-gray-100 text-gray-600';
}

export function getBatchStatusColor(status: string): string {
  const greens = ['Ready', 'Ready to Use', 'Tested Clean', 'Colonized', 'Ready for Inoculation', 'Ready to Harvest'];
  const reds = ['Contaminated', 'Discarded', 'Failed'];
  const oranges = ['Delayed', 'Needs Inspection', 'Partially Contaminated'];
  const blues = ['Incubating', 'Fruiting', 'Pinning', 'Moving'];
  const grays = ['Closed', 'Spent', 'Archived'];

  if (greens.some(s => status.includes(s))) return 'bg-emerald-100 text-emerald-800';
  if (reds.some(s => status.includes(s))) return 'bg-red-100 text-red-800';
  if (oranges.some(s => status.includes(s))) return 'bg-orange-100 text-orange-700';
  if (blues.some(s => status.includes(s))) return 'bg-blue-100 text-blue-800';
  if (grays.some(s => status.includes(s))) return 'bg-gray-100 text-gray-600';
  return 'bg-slate-100 text-slate-700';
}

export function canManage(role: string): boolean {
  return role === 'admin' || role === 'manager';
}

export function isAdmin(role: string): boolean {
  return role === 'admin';
}

export function truncate(str: string | null | undefined, len = 50): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function generateQrText(entityType: string, label: string): string {
  const prefix = {
    batch: 'QR-BATCH',
    location: 'QR-LOC',
    rack: 'QR-RACK',
    shelf: 'QR-SHELF',
    harvest_crate: 'QR-CRATE',
    checkpoint: 'QR-CHECKPOINT',
    task: 'QR-TASK',
    other: 'QR-OTH',
  }[entityType] ?? 'QR';

  const sanitized = label.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').toUpperCase().slice(0, 24);
  return `${prefix}-${sanitized}`;
}

export function buildQrUrl(qrText: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}#/scan?code=${encodeURIComponent(qrText)}`;
}

export interface QrOfflineData {
  code: string;
  type: string;
  label: string;
  info?: string;
  date?: string;
}

export function buildQrPayload(qrText: string, entityType: string, label: string, info?: string, date?: string): string {
  const parts = ['MYCO', qrText, entityType, label];
  if (info) parts.push(info);
  if (date) parts.push(date);
  return parts.join('|');
}

export function parseQrPayload(raw: string): QrOfflineData | null {
  if (!raw.startsWith('MYCO|')) return null;
  const parts = raw.split('|');
  if (parts.length < 4) return null;
  return {
    code: parts[1],
    type: parts[2],
    label: parts[3],
    info: parts[4] || undefined,
    date: parts[5] || undefined,
  };
}

export function getQrStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Active': 'bg-emerald-100 text-emerald-800',
    'Inactive': 'bg-gray-100 text-gray-600',
    'Lost': 'bg-red-100 text-red-700',
    'Replaced': 'bg-amber-100 text-amber-700',
    'Archived': 'bg-gray-200 text-gray-500',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-600';
}

export function getQrEntityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    batch: 'Batch',
    location: 'Location',
    rack: 'Rack',
    shelf: 'Shelf',
    harvest_crate: 'Harvest Crate',
    checkpoint: 'Checkpoint',
    task: 'Task',
    other: 'Other',
  };
  return labels[type] ?? type;
}

export function getQrScanResultColor(result: string): string {
  if (result === 'Success') return 'text-emerald-600';
  if (result === 'Invalid code' || result === 'Inactive code') return 'text-red-600';
  if (result === 'Wrong location' || result === 'Wrong entity') return 'text-orange-600';
  return 'text-gray-600';
}

export function getVerificationResultColor(result: string): string {
  if (result === 'Matched') return 'bg-emerald-100 text-emerald-700';
  return 'bg-red-100 text-red-700';
}

export function getAlertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    temp_high: 'High Temperature',
    temp_low: 'Low Temperature',
    humidity_high: 'High Humidity',
    humidity_low: 'Low Humidity',
    co2_high: 'High CO2',
  };
  return labels[type] ?? type;
}

export function getAlertTypeColor(type: string): string {
  const colors: Record<string, string> = {
    temp_high: 'bg-red-100 text-red-700',
    temp_low: 'bg-blue-100 text-blue-700',
    humidity_high: 'bg-cyan-100 text-cyan-700',
    humidity_low: 'bg-orange-100 text-orange-700',
    co2_high: 'bg-amber-100 text-amber-700',
  };
  return colors[type] ?? 'bg-gray-100 text-gray-600';
}

export function getDeviceStatusColor(lastSeen: string | null, intervalSeconds: number): 'online' | 'stale' | 'offline' {
  if (!lastSeen) return 'offline';
  const elapsed = Date.now() - new Date(lastSeen).getTime();
  const threshold = intervalSeconds * 2 * 1000;
  if (elapsed <= threshold) return 'online';
  if (elapsed <= threshold * 2) return 'stale';
  return 'offline';
}
