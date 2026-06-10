import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Building2, ChevronDown, ChevronUp, QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { canManage, getRoomTypeLabel, generateQrText } from '../lib/utils';
import type { Room, Rack, Shelf } from '../lib/types';

const ROOM_TYPES = ['lab', 'incubation', 'fruiting', 'storage', 'substrate_prep', 'packaging', 'waste', 'other'];

export default function Rooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [racks, setRacks] = useState<Record<string, Rack[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showRackModal, setShowRackModal] = useState<string | null>(null);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [editRack, setEditRack] = useState<Rack | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [roomsRes, racksRes] = await Promise.all([
      supabase.from('rooms').select('*').order('name'),
      supabase.from('racks').select('*').order('name'),
    ]);
    setRooms(roomsRes.data ?? []);
    const grouped: Record<string, Rack[]> = {};
    for (const r of racksRes.data ?? []) {
      if (!grouped[r.room_id!]) grouped[r.room_id!] = [];
      grouped[r.room_id!].push(r);
    }
    setRacks(grouped);
    setLoading(false);
  }

  function toggle(id: string) {
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function generateRoomQr(room: Room) {
    if (!user) return;
    const qrText = generateQrText('location', room.name);
    await supabase.from('qr_codes').insert({
      qr_text: qrText, entity_type: 'location', entity_id: room.id,
      label: room.name, description: getRoomTypeLabel(room.room_type),
      status: 'Active', created_by: user.id,
    });
  }

  async function generateRackQr(rack: Rack) {
    if (!user) return;
    const qrText = generateQrText('rack', rack.name);
    await supabase.from('qr_codes').insert({
      qr_text: qrText, entity_type: 'rack', entity_id: rack.id,
      label: rack.name, status: 'Active', created_by: user.id,
    });
  }

  if (loading) return <PageLoader />;

  const roomTypeColors: Record<string, string> = {
    lab: 'bg-violet-100 text-violet-700',
    incubation: 'bg-blue-100 text-blue-700',
    fruiting: 'bg-emerald-100 text-emerald-700',
    storage: 'bg-gray-100 text-gray-600',
    substrate_prep: 'bg-amber-100 text-amber-700',
    packaging: 'bg-teal-100 text-teal-700',
    waste: 'bg-red-100 text-red-600',
    other: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rooms & Locations</h1>
          <p className="text-sm text-gray-500">{rooms.length} rooms</p>
        </div>
        {canManage(user?.role ?? '') && (
          <button onClick={() => { setEditRoom(null); setShowRoomModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
            <Plus size={16} /> New Room
          </button>
        )}
      </div>

      {rooms.length === 0 ? (
        <EmptyState icon={Building2} title="No rooms defined" description="Add rooms to start tracking locations." />
      ) : (
        <div className="space-y-3">
          {rooms.map(room => (
            <div key={room.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50" onClick={() => toggle(room.id)}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${roomTypeColors[room.room_type] ?? 'bg-gray-100'}`}>
                  <Building2 size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">{room.name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roomTypeColors[room.room_type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {getRoomTypeLabel(room.room_type)}
                    </span>
                    <StatusBadge label={room.is_active ? 'Active' : 'Inactive'} color={room.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} />
                  </div>
                  {(room.temp_min || room.humidity_min) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {room.temp_min && room.temp_max ? `${room.temp_min}–${room.temp_max}°C` : ''}
                      {room.humidity_min && room.humidity_max ? ` · ${room.humidity_min}–${room.humidity_max}% RH` : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{racks[room.id]?.length ?? 0} rack{(racks[room.id]?.length ?? 0) !== 1 ? 's' : ''}</span>
                  {canManage(user?.role ?? '') && (
                    <>
                      <button onClick={e => { e.stopPropagation(); setShowRackModal(room.id); setEditRack(null); }}
                        className="px-2 py-1 text-xs text-emerald-600 font-medium hover:bg-emerald-50 rounded">+ Rack</button>
                      <button onClick={e => { e.stopPropagation(); generateRoomQr(room); }}
                        title="Generate QR for this room"
                        className="p-1.5 rounded-lg hover:bg-gray-100">
                        <QrCode size={13} className="text-gray-400" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setEditRoom(room); setShowRoomModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100">
                        <Edit2 size={13} className="text-gray-400" />
                      </button>
                    </>
                  )}
                  {expanded.has(room.id) ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {expanded.has(room.id) && (
                <div className="border-t border-gray-100">
                  {room.notes && <p className="text-sm text-gray-600 px-5 py-3 bg-gray-50/50">{room.notes}</p>}
                  {(racks[room.id] ?? []).length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {racks[room.id].map(rack => (
                        <div key={rack.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">{rack.name}</span>
                            <span className="text-xs text-gray-400 ml-2">{rack.shelf_count ?? 0} shelves</span>
                          </div>
                          {canManage(user?.role ?? '') && (
                            <>
                              <button onClick={() => generateRackQr(rack)}
                                title="Generate QR for rack"
                                className="p-1.5 rounded-lg hover:bg-gray-100">
                                <QrCode size={13} className="text-gray-400" />
                              </button>
                              <button onClick={() => { setEditRack(rack); setShowRackModal(room.id); }}
                                className="p-1.5 rounded-lg hover:bg-gray-100">
                                <Edit2 size={13} className="text-gray-400" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 px-5 py-3">No racks in this room.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showRoomModal && (
        <RoomModal room={editRoom} onClose={() => setShowRoomModal(false)} onSaved={fetchAll} />
      )}
      {showRackModal && (
        <RackModal roomId={showRackModal} rack={editRack} onClose={() => setShowRackModal(null)} onSaved={fetchAll} />
      )}
    </div>
  );
}

function RoomModal({ room, onClose, onSaved }: { room: Room | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: room?.name ?? '',
    room_type: room?.room_type ?? 'lab',
    capacity: room?.capacity ?? '',
    temp_min: room?.temp_min ?? '',
    temp_max: room?.temp_max ?? '',
    humidity_min: room?.humidity_min ?? '',
    humidity_max: room?.humidity_max ?? '',
    co2_max: room?.co2_max ?? '',
    notes: room?.notes ?? '',
    is_active: room?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!form.name) return;
    setLoading(true);
    const data = {
      name: form.name,
      room_type: form.room_type,
      capacity: form.capacity ? +form.capacity : null,
      temp_min: form.temp_min ? +form.temp_min : null,
      temp_max: form.temp_max ? +form.temp_max : null,
      humidity_min: form.humidity_min ? +form.humidity_min : null,
      humidity_max: form.humidity_max ? +form.humidity_max : null,
      co2_max: form.co2_max ? +form.co2_max : null,
      notes: form.notes || null,
      is_active: form.is_active,
    };
    if (room) {
      await supabase.from('rooms').update({ ...data, updated_at: new Date().toISOString() }).eq('id', room.id);
    } else {
      await supabase.from('rooms').insert(data);
    }
    setLoading(false);
    onSaved();
    onClose();
  }

  const f = form;
  return (
    <Modal open onClose={onClose} title={room ? 'Edit Room' : 'New Room'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
            <input value={f.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
            <select value={f.room_type} onChange={e => setForm(p => ({ ...p, room_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              {ROOM_TYPES.map(t => <option key={t} value={t}>{getRoomTypeLabel(t)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input type="number" value={f.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temp Min (°C)</label>
            <input type="number" value={f.temp_min} onChange={e => setForm(p => ({ ...p, temp_min: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temp Max (°C)</label>
            <input type="number" value={f.temp_max} onChange={e => setForm(p => ({ ...p, temp_max: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Humidity Min (%)</label>
            <input type="number" value={f.humidity_min} onChange={e => setForm(p => ({ ...p, humidity_min: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Humidity Max (%)</label>
            <input type="number" value={f.humidity_max} onChange={e => setForm(p => ({ ...p, humidity_max: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={f.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} /> Active</label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={loading || !f.name} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  );
}

function RackModal({ roomId, rack, onClose, onSaved }: { roomId: string; rack: Rack | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(rack?.name ?? '');
  const [shelfCount, setShelfCount] = useState(rack?.shelf_count ?? 4);
  const [notes, setNotes] = useState(rack?.notes ?? '');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name) return;
    setLoading(true);
    const data = { name, shelf_count: shelfCount, notes: notes || null, room_id: roomId };
    if (rack) {
      await supabase.from('racks').update({ ...data, updated_at: new Date().toISOString() }).eq('id', rack.id);
    } else {
      await supabase.from('racks').insert(data);
    }
    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={rack ? 'Edit Rack' : 'New Rack'} size="sm">
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Rack Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Shelf Count</label>
          <input type="number" value={shelfCount} onChange={e => setShelfCount(+e.target.value)} min={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={loading || !name} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  );
}
