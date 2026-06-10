import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Thermometer, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDateTime } from '../lib/utils';
import type { EnvironmentalLog, Room } from '../lib/types';

export default function EnvironmentalLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<EnvironmentalLog[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRoom, setFilterRoom] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchLogs = useCallback(async () => {
    let q = supabase.from('environmental_logs')
      .select('*, room:rooms(name), logger:profiles(full_name)')
      .order('logged_at', { ascending: false });
    if (filterRoom) q = q.eq('room_id', filterRoom);
    const { data } = await q.limit(100);
    setLogs(data as EnvironmentalLog[] ?? []);
    setLoading(false);
  }, [filterRoom]);

  useEffect(() => {
    supabase.from('rooms').select('*').eq('is_active', true).then(({ data }) => setRooms(data ?? []));
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Environmental Logs</h1>
          <p className="text-sm text-gray-500">{logs.length} records</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
          <Plus size={16} /> Log Reading
        </button>
      </div>

      <div className="mb-4">
        <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All Rooms</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : logs.length === 0 ? (
        <EmptyState icon={Thermometer} title="No environmental logs" description="Record room conditions to track environmental data." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Date/Time</th>
                  <th className="text-left px-3 py-3">Room</th>
                  <th className="text-right px-3 py-3">Temp (°C)</th>
                  <th className="text-right px-3 py-3">Humidity (%)</th>
                  <th className="text-right px-3 py-3 hidden lg:table-cell">CO₂</th>
                  <th className="text-left px-3 py-3 hidden lg:table-cell">Fan</th>
                  <th className="text-left px-3 py-3 hidden lg:table-cell">Humidifier</th>
                  <th className="text-left px-3 py-3">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700">{formatDateTime(log.logged_at)}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{(log as any).room?.name ?? '—'}</td>
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
                    <td className="px-3 py-3 text-gray-500">{(log as any).logger?.full_name ?? '—'}</td>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Room *</label>
            <select value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Select room...</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date/Time</label>
            <input type="datetime-local" value={form.logged_at} onChange={e => setForm(f => ({ ...f, logged_at: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
            <input type="number" value={form.temperature} onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))} step="0.1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Humidity (%)</label>
            <input type="number" value={form.humidity} onChange={e => setForm(f => ({ ...f, humidity: e.target.value }))} step="0.1" min="0" max="100" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CO₂ (ppm)</label>
            <input type="number" value={form.co2} onChange={e => setForm(f => ({ ...f, co2: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fan Status</label>
            <select value={form.fan_status} onChange={e => setForm(f => ({ ...f, fan_status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              {['On', 'Off', 'Auto'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Humidifier</label>
            <select value={form.humidifier_status} onChange={e => setForm(f => ({ ...f, humidifier_status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              {['On', 'Off', 'Auto'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Light Status</label>
            <select value={form.light_status} onChange={e => setForm(f => ({ ...f, light_status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              {['On', 'Off', 'Auto'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={loading || !form.room_id} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save Log</button>
        </div>
      </div>
    </Modal>
  );
}
