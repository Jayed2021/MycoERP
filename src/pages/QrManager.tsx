import React, { useEffect, useState, useCallback } from 'react';
import { QrCode, Plus, Search, RotateCcw, Archive, AlertTriangle, ChevronRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { QrCodeDisplay } from '../components/QrCodeDisplay';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDateTime, canManage } from '../lib/utils';
import { getQrStatusColor, getQrEntityTypeLabel, generateQrText } from '../lib/utils';
import type { QrCode as QrCodeType, Batch, Room, Rack } from '../lib/types';

const ENTITY_TYPES = ['batch', 'location', 'rack', 'shelf', 'harvest_crate', 'checkpoint', 'other'];
const STATUSES = ['Active', 'Inactive', 'Lost', 'Replaced', 'Archived'];

export default function QrManager() {
  const { user } = useAuth();
  const [qrCodes, setQrCodes] = useState<QrCodeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('Active');
  const [selectedQr, setSelectedQr] = useState<QrCodeType | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  const fetchQrCodes = useCallback(async () => {
    let q = supabase.from('qr_codes')
      .select('*, creator:profiles(full_name)')
      .order('created_at', { ascending: false });
    if (filterType) q = q.eq('entity_type', filterType);
    if (filterStatus) q = q.eq('status', filterStatus);
    if (search) q = q.ilike('qr_text', `%${search}%`);
    const { data } = await q.limit(200);
    setQrCodes(data as QrCodeType[] ?? []);
    setLoading(false);
  }, [filterType, filterStatus, search]);

  useEffect(() => { fetchQrCodes(); }, [fetchQrCodes]);

  async function replaceQr(qrCode: QrCodeType) {
    const newText = generateQrText(qrCode.entity_type, qrCode.label) + '-R' + Date.now().toString().slice(-4);
    const { data: newQr } = await supabase.from('qr_codes').insert({
      qr_text: newText,
      entity_type: qrCode.entity_type,
      entity_id: qrCode.entity_id,
      label: qrCode.label,
      description: qrCode.description,
      created_by: user?.id,
    }).select().single();

    if (newQr) {
      await supabase.from('qr_codes').update({ status: 'Replaced', replaced_by: newQr.id, updated_at: new Date().toISOString() }).eq('id', qrCode.id);
      fetchQrCodes();
    }
  }

  async function updateStatus(qrId: string, status: string) {
    await supabase.from('qr_codes').update({ status, updated_at: new Date().toISOString() }).eq('id', qrId);
    fetchQrCodes();
    if (selectedQr?.id === qrId) setSelectedQr(null);
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Codes</h1>
          <p className="text-sm text-gray-500">{qrCodes.length} code{qrCodes.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage(user?.role ?? '') && (
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
          >
            <Plus size={16} /> Generate QR
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search code..."
            className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-48"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All Types</option>
          {ENTITY_TYPES.map(t => <option key={t} value={t}>{getQrEntityTypeLabel(t)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : qrCodes.length === 0 ? (
        <EmptyState icon={QrCode} title="No QR codes found" description="Generate QR codes for batches, rooms, and locations." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">QR Code</th>
                  <th className="text-left px-3 py-3">Type</th>
                  <th className="text-left px-3 py-3">Label</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3 hidden lg:table-cell">Last Scanned</th>
                  <th className="text-left px-3 py-3 hidden lg:table-cell">Printed</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {qrCodes.map(qr => (
                  <tr key={qr.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{qr.qr_text}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{getQrEntityTypeLabel(qr.entity_type)}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{qr.label}</td>
                    <td className="px-3 py-3"><StatusBadge label={qr.status} color={getQrStatusColor(qr.status)} /></td>
                    <td className="px-3 py-3 text-gray-400 hidden lg:table-cell">{qr.last_scanned_at ? formatDateTime(qr.last_scanned_at) : '—'}</td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {qr.printed_at ? <span className="text-xs text-emerald-600">✓ Printed</span> : <span className="text-xs text-gray-400">Not printed</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setSelectedQr(qr)} className="px-2 py-1 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded font-medium">
                          View
                        </button>
                        {canManage(user?.role ?? '') && qr.status === 'Active' && (
                          <>
                            <button onClick={() => replaceQr(qr)} className="px-2 py-1 text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 rounded font-medium" title="Replace (issue new code)">
                              Replace
                            </button>
                            <button onClick={() => updateStatus(qr.id, 'Inactive')} className="px-2 py-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded font-medium">
                              Deactivate
                            </button>
                          </>
                        )}
                        {canManage(user?.role ?? '') && qr.status === 'Lost' && (
                          <button onClick={() => replaceQr(qr)} className="px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded font-medium">
                            Re-issue
                          </button>
                        )}
                        {canManage(user?.role ?? '') && !['Archived'].includes(qr.status) && (
                          <button onClick={() => updateStatus(qr.id, 'Lost')} className="p-1 rounded hover:bg-red-50" title="Mark as lost">
                            <AlertTriangle size={12} className="text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Detail Modal */}
      {selectedQr && (
        <Modal open onClose={() => setSelectedQr(null)} title={`QR Code: ${selectedQr.label}`} size="md">
          <div className="space-y-4">
            <div className="flex justify-center py-4">
              <QrCodeDisplay qrCode={selectedQr} size={200} onUpdated={fetchQrCodes} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Entity Type</p><p className="font-medium">{getQrEntityTypeLabel(selectedQr.entity_type)}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><StatusBadge label={selectedQr.status} color={getQrStatusColor(selectedQr.status)} /></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">QR Code Text</p><p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-0.5">{selectedQr.qr_text}</p></div>
              {selectedQr.description && <div className="col-span-2"><p className="text-xs text-gray-500">Description</p><p>{selectedQr.description}</p></div>}
              <div><p className="text-xs text-gray-500">Last Scanned</p><p>{selectedQr.last_scanned_at ? formatDateTime(selectedQr.last_scanned_at) : 'Never'}</p></div>
              <div><p className="text-xs text-gray-500">Printed</p><p>{selectedQr.printed_at ? formatDateTime(selectedQr.printed_at) : 'Not yet'}</p></div>
            </div>
            {canManage(user?.role ?? '') && selectedQr.status === 'Active' && (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => { replaceQr(selectedQr); setSelectedQr(null); }} className="flex-1 py-2 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg font-medium">
                  <RotateCcw size={13} className="inline mr-1" /> Replace
                </button>
                <button onClick={() => updateStatus(selectedQr.id, 'Lost')} className="flex-1 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-lg font-medium">
                  <AlertTriangle size={13} className="inline mr-1" /> Mark Lost
                </button>
                <button onClick={() => updateStatus(selectedQr.id, 'Archived')} className="flex-1 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">
                  <Archive size={13} className="inline mr-1" /> Archive
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showGenerate && (
        <GenerateQrModal onClose={() => setShowGenerate(false)} onCreated={fetchQrCodes} />
      )}
    </div>
  );
}

function GenerateQrModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [entityType, setEntityType] = useState<string>('batch');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<QrCodeType | null>(null);

  useEffect(() => {
    if (entityType === 'batch') {
      supabase.from('batches').select('id, batch_code, species:species(name)').not('status', 'in', '("Closed","Discarded")').limit(100).then(({ data }) => setBatches(data as Batch[] ?? []));
    } else if (entityType === 'location') {
      supabase.from('rooms').select('*').eq('is_active', true).then(({ data }) => setRooms(data ?? []));
    } else if (entityType === 'rack') {
      supabase.from('racks').select('*, room:rooms(name)').then(({ data }) => setRacks(data ?? []));
    }
  }, [entityType]);

  async function generate() {
    if (!selectedId && entityType !== 'checkpoint' && entityType !== 'harvest_crate' && entityType !== 'other') {
      setError('Please select an entity'); return;
    }
    const label = customLabel.trim() || getAutoLabel();
    if (!label) { setError('Label is required'); return; }
    setLoading(true);
    setError('');

    const entityId = selectedId || crypto.randomUUID();
    const qrText = generateQrText(entityType, label);

    const { data, error: err } = await supabase.from('qr_codes').insert({
      qr_text: qrText,
      entity_type: entityType,
      entity_id: entityId,
      label,
      description: description || null,
      created_by: user?.id,
    }).select().single();

    setLoading(false);
    if (err) { setError(err.message); return; }
    setCreated(data as QrCodeType);
    onCreated();
  }

  function getAutoLabel(): string {
    if (entityType === 'batch') {
      const b = batches.find(b => b.id === selectedId);
      return b?.batch_code ?? '';
    }
    if (entityType === 'location') {
      const r = rooms.find(r => r.id === selectedId);
      return r?.name ?? '';
    }
    if (entityType === 'rack') {
      const r = racks.find(r => r.id === selectedId);
      return r?.name ?? '';
    }
    return '';
  }

  return (
    <Modal open onClose={onClose} title="Generate QR Code" size="md">
      {created ? (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-emerald-800">QR Code Created!</p>
          </div>
          <div className="flex justify-center">
            <QrCodeDisplay qrCode={created} size={200} onUpdated={onCreated} />
          </div>
          <button onClick={onClose} className="w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select value={entityType} onChange={e => { setEntityType(e.target.value); setSelectedId(''); setCustomLabel(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{getQrEntityTypeLabel(t)}</option>)}
            </select>
          </div>

          {entityType === 'batch' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Select batch...</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code} {(b as any).species?.name ? `— ${(b as any).species.name}` : ''}</option>)}
              </select>
            </div>
          )}
          {entityType === 'location' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Select room...</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          {entityType === 'rack' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rack</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Select rack...</option>
                {racks.map(r => <option key={r.id} value={r.id}>{r.name} {(r as any).room?.name ? `(${(r as any).room.name})` : ''}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label {getAutoLabel() && <span className="text-gray-400">(auto: {getAutoLabel()})</span>}
            </label>
            <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
              placeholder={getAutoLabel() || 'Label for this QR code...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={generate} disabled={loading} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">
              {loading ? 'Generating…' : 'Generate QR'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
