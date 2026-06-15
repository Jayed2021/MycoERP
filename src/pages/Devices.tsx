import { useEffect, useState } from 'react';
import { Plus, Cpu, RefreshCw, Trash2, Wifi, WifiOff, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { formatRelativeTime, getDeviceStatusColor } from '../lib/utils';
import type { IoTDevice, Room } from '../lib/types';

export default function Devices() {
  useAuth();
  const { t } = useTranslation();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IoTDevice | null>(null);
  const [newApiKey, setNewApiKey] = useState<{ deviceId: string; key: string } | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [devRes, roomRes] = await Promise.all([
      supabase.from('iot_devices').select('*, room:rooms(id, name)').order('created_at', { ascending: false }),
      supabase.from('rooms').select('*').eq('is_active', true).order('name'),
    ]);
    setDevices(devRes.data as IoTDevice[] ?? []);
    setRooms(roomRes.data ?? []);
    setLoading(false);
  }

  async function toggleActive(device: IoTDevice) {
    await supabase.from('iot_devices').update({ is_active: !device.is_active, updated_at: new Date().toISOString() }).eq('id', device.id);
    fetchAll();
  }

  async function regenerateKey(device: IoTDevice) {
    const rawKey = crypto.randomUUID() + '-' + crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    await supabase.from('iot_devices').update({ api_key_hash: hash, updated_at: new Date().toISOString() }).eq('id', device.id);
    setNewApiKey({ deviceId: device.id, key: rawKey });
    fetchAll();
  }

  async function deleteDevice() {
    if (!deleteTarget) return;
    await supabase.from('iot_devices').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchAll();
  }

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('devices.title')}</h1>
          <p className="text-sm text-gray-500">{devices.length} registered sensor{devices.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={16} /> {t('devices.registerDevice')}
        </button>
      </div>

      {devices.length === 0 ? (
        <EmptyState icon={Cpu} title={t('devices.noDevices')} description={t('devices.noDevicesDesc')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map(device => {
            const status = getDeviceStatusColor(device.last_seen_at, device.reporting_interval_seconds);
            const statusColors = { online: 'bg-emerald-500', stale: 'bg-amber-500', offline: 'bg-red-500' };
            const statusLabels = { online: t('devices.online'), stale: t('devices.stale'), offline: t('devices.offline') };

            return (
              <div key={device.id} className={`bg-white rounded-xl border border-gray-200 p-5 ${!device.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Cpu size={18} className="text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{device.device_name}</h3>
                      <p className="text-xs text-gray-500">{(device as any).room?.name ?? t('devices.noRoom')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                    <span className="text-xs text-gray-500">{statusLabels[status]}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('devices.deviceType')}</span>
                    <span className="text-gray-900 font-medium uppercase">{device.device_type}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('devices.interval')}</span>
                    <span className="text-gray-900 font-medium">{Math.round(device.reporting_interval_seconds / 60)} min</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t('devices.lastSeen')}</span>
                    <span className="text-gray-900 font-medium">{device.last_seen_at ? formatRelativeTime(device.last_seen_at) : t('devices.never')}</span>
                  </div>
                  {device.firmware_version && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{t('devices.firmware')}</span>
                      <span className="text-gray-900 font-medium">{device.firmware_version}</span>
                    </div>
                  )}
                </div>

                {newApiKey?.deviceId === device.id && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-800 mb-1">{t('devices.newApiKey')}</p>
                    <ApiKeyCopy value={newApiKey.key} />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button onClick={() => toggleActive(device)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${device.is_active ? 'text-gray-600 hover:bg-gray-100' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                    {device.is_active ? <WifiOff size={12} /> : <Wifi size={12} />}
                    {device.is_active ? t('devices.disable') : t('devices.enable')}
                  </button>
                  <button onClick={() => regenerateKey(device)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                    <RefreshCw size={12} /> {t('devices.newKey')}
                  </button>
                  <button onClick={() => setDeleteTarget(device)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto">
                    <Trash2 size={12} /> {t('common.delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRegister && (
        <RegisterDeviceModal
          rooms={rooms}
          onClose={() => setShowRegister(false)}
          onRegistered={(deviceId, key) => { setNewApiKey({ deviceId, key }); fetchAll(); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={true}
          title={t('devices.deleteDevice')}
          message={t('devices.deleteConfirm', { name: deleteTarget.device_name })}
          onConfirm={deleteDevice}
          onClose={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  );
}

function ApiKeyCopy({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-xs bg-white px-2 py-1 rounded border border-amber-200 text-amber-900 break-all select-all">{value}</code>
      <button onClick={copy} className="p-1.5 rounded hover:bg-amber-100 transition-colors">
        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-amber-600" />}
      </button>
    </div>
  );
}

function RegisterDeviceModal({ rooms, onClose, onRegistered }: {
  rooms: Room[];
  onClose: () => void;
  onRegistered: (deviceId: string, apiKey: string) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    device_name: '',
    room_id: '',
    device_type: 'esp32',
    reporting_interval_seconds: 900,
  });
  const [loading, setLoading] = useState(false);

  async function register() {
    if (!form.device_name || !form.room_id) return;
    setLoading(true);

    const rawKey = crypto.randomUUID() + '-' + crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: inserted, error } = await supabase.from('iot_devices').insert({
      device_name: form.device_name,
      room_id: form.room_id,
      device_type: form.device_type,
      api_key_hash: hash,
      reporting_interval_seconds: form.reporting_interval_seconds,
      is_active: true,
    }).select('id').single();

    setLoading(false);
    if (!error && inserted) {
      onRegistered(inserted.id, rawKey);
      onClose();
    }
  }

  return (
    <Modal open onClose={onClose} title={t('devices.registerDevice')} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('devices.deviceName')} *</label>
          <input value={form.device_name} onChange={e => setForm(f => ({ ...f, device_name: e.target.value }))}
            placeholder={t('devices.deviceNamePlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('envLogs.room')} *</label>
          <select value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Select room...</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('devices.deviceType')}</label>
            <select value={form.device_type} onChange={e => setForm(f => ({ ...f, device_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="esp32">ESP32</option>
              <option value="rpi">Raspberry Pi</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('devices.intervalSeconds')}</label>
            <input type="number" value={form.reporting_interval_seconds} onChange={e => setForm(f => ({ ...f, reporting_interval_seconds: +e.target.value }))}
              min={60} step={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <p className="text-xs text-gray-500">{t('devices.apiKeyWarning')}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">{t('common.cancel')}</button>
          <button onClick={register} disabled={loading || !form.device_name || !form.room_id}
            className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors">
            {t('devices.register')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
