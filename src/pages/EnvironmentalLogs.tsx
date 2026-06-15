import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Thermometer, Cpu, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDateTime } from '../lib/utils';
import type { EnvironmentalLog, Room } from '../lib/types';

export default function EnvironmentalLogs() {
  useAuth();
  const { t } = useTranslation();
  const [logs, setLogs] = useState<EnvironmentalLog[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRoom, setFilterRoom] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [liveRooms, setLiveRooms] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    let q = supabase.from('environmental_logs')
      .select('*, room:rooms(name), logger:profiles(full_name), device:iot_devices(device_name)')
      .order('logged_at', { ascending: false });
    if (filterRoom) q = q.eq('room_id', filterRoom);
    if (filterSource) q = q.eq('source', filterSource);
    const { data } = await q.limit(100);
    setLogs(data as EnvironmentalLog[] ?? []);

    // Determine which rooms have recent IoT readings (within 20 min)
    const twentyMinAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const { data: recentIot } = await supabase.from('environmental_logs')
      .select('room_id')
      .eq('source', 'iot')
      .gte('logged_at', twentyMinAgo);
    const live = new Set<string>();
    for (const r of recentIot ?? []) {
      if (r.room_id) live.add(r.room_id);
    }
    setLiveRooms(live);
    setLoading(false);
  }, [filterRoom, filterSource]);

  useEffect(() => {
    supabase.from('rooms').select('*').eq('is_active', true).then(({ data }) => setRooms(data ?? []));
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('envLogs.title')}</h1>
          <p className="text-sm text-gray-500">{logs.length} {t('common.records')}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
          <Plus size={16} /> {t('envLogs.logReading')}
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">{t('envLogs.allRooms')}</option>
          {rooms.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}{liveRooms.has(r.id) ? ' (Live)' : ''}
            </option>
          ))}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">{t('envLogs.allSources')}</option>
          <option value="manual">{t('envLogs.manual')}</option>
          <option value="iot">{t('envLogs.iot')}</option>
        </select>
        {liveRooms.size > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {liveRooms.size} room{liveRooms.size !== 1 ? 's' : ''} reporting live
          </div>
        )}
      </div>

      {loading ? <PageLoader /> : logs.length === 0 ? (
        <EmptyState icon={Thermometer} title={t('envLogs.noLogs')} description={t('envLogs.noLogsDesc')} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">{t('envLogs.dateTime')}</th>
                  <th className="text-left px-3 py-3">{t('envLogs.room')}</th>
                  <th className="text-left px-3 py-3">{t('envLogs.source')}</th>
                  <th className="text-right px-3 py-3">{t('envLogs.temp')}</th>
                  <th className="text-right px-3 py-3">{t('envLogs.humidity')}</th>
                  <th className="text-right px-3 py-3 hidden lg:table-cell">{t('envLogs.co2')}</th>
                  <th className="text-left px-3 py-3 hidden lg:table-cell">{t('envLogs.fan')}</th>
                  <th className="text-left px-3 py-3 hidden lg:table-cell">{t('envLogs.humidifier')}</th>
                  <th className="text-left px-3 py-3">{t('envLogs.loggedBy')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700">{formatDateTime(log.logged_at)}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        {(log as any).room?.name ?? '—'}
                        {log.source === 'iot' && liveRooms.has(log.room_id ?? '') && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {log.source === 'iot' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          <Cpu size={10} /> IoT
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Manual</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {log.temperature !== null ? (
                        <span className={`font-medium ${log.temperature > 28 ? 'text-red-500' : log.temperature < 18 ? 'text-blue-500' : 'text-gray-900'}`}>{log.temperature}°</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {log.humidity !== null ? (
                        <span className={`font-medium ${log.humidity < 70 ? 'text-orange-500' : 'text-gray-900'}`}>{log.humidity}%</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-500 hidden lg:table-cell">{log.co2 ?? '—'}</td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {log.fan_status && <span className={`px-1.5 py-0.5 rounded text-xs ${log.fan_status === 'On' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{log.fan_status}</span>}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {log.humidifier_status && <span className={`px-1.5 py-0.5 rounded text-xs ${log.humidifier_status === 'On' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{log.humidifier_status}</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-500">
                      {log.source === 'iot' ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Wifi size={11} /> {(log as any).device?.device_name ?? 'Sensor'}
                        </span>
                      ) : (
                        (log as any).logger?.full_name ?? '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <LogCreateModal rooms={rooms} onClose={() => setShowCreate(false)} onCreated={fetchLogs} />}
    </div>
  );
}

function LogCreateModal({ rooms, onClose, onCreated }: { rooms: Room[]; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    room_id: '',
    logged_at: new Date().toISOString().slice(0, 16),
    temperature: '',
    humidity: '',
    co2: '',
    light_status: 'On',
    fan_status: 'On',
    humidifier_status: 'On',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!form.room_id) return;
    setLoading(true);
    await supabase.from('environmental_logs').insert({
      room_id: form.room_id,
      logged_at: form.logged_at,
      temperature: form.temperature ? +form.temperature : null,
      humidity: form.humidity ? +form.humidity : null,
      co2: form.co2 ? +form.co2 : null,
      light_status: form.light_status,
      fan_status: form.fan_status,
      humidifier_status: form.humidifier_status,
      notes: form.notes || null,
      logged_by: user?.id,
    });
    setLoading(false);
    onCreated();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Log Environmental Reading" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('envLogs.room')} *</label>
            <select value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Select room...</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('envLogs.dateTime')}</label>
            <input type="datetime-local" value={form.logged_at} onChange={e => setForm(f => ({ ...f, logged_at: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('envLogs.temp')}</label>
            <input type="number" value={form.temperature} onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))} step="0.1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('envLogs.humidity')}</label>
            <input type="number" value={form.humidity} onChange={e => setForm(f => ({ ...f, humidity: e.target.value }))} step="0.1" min="0" max="100" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('envLogs.co2')}</label>
            <input type="number" value={form.co2} onChange={e => setForm(f => ({ ...f, co2: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('envLogs.fanStatus')}</label>
            <select value={form.fan_status} onChange={e => setForm(f => ({ ...f, fan_status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              {['On', 'Off', 'Auto'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('envLogs.humidifierStatus')}</label>
            <select value={form.humidifier_status} onChange={e => setForm(f => ({ ...f, humidifier_status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              {['On', 'Off', 'Auto'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('envLogs.lightStatus')}</label>
            <select value={form.light_status} onChange={e => setForm(f => ({ ...f, light_status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              {['On', 'Off', 'Auto'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.notes')}</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">{t('common.cancel')}</button>
          <button onClick={save} disabled={loading || !form.room_id} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">{t('common.save')}</button>
        </div>
      </div>
    </Modal>
  );
}
