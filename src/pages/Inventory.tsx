import React, { useEffect, useState, useCallback } from 'react';
import { Plus, PackageOpen, TrendingDown, Edit2, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { formatDate, canManage } from '../lib/utils';
import type { InventoryItem, InventoryMovement } from '../lib/types';

const CATEGORIES = ['Grain', 'Substrate', 'Supplement', 'Packaging', 'Lab Supply', 'Cleaning Supply', 'Equipment Part', 'Other'];

export default function Inventory() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState<InventoryItem | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [recentMovements, setRecentMovements] = useState<InventoryMovement[]>([]);

  const fetchAll = useCallback(async () => {
    let q = supabase.from('inventory_items').select('*').eq('is_active', true).order('category').order('name');
    if (filterCategory) q = q.eq('category', filterCategory);
    if (showLowStock) q = q.lte('current_stock', supabase.from('inventory_items').select('minimum_stock'));
    const { data } = await q;
    let filtered = data ?? [];
    if (showLowStock) filtered = filtered.filter(i => i.current_stock <= i.minimum_stock);
    setItems(filtered);

    const { data: movements } = await supabase.from('inventory_movements')
      .select('*, item:inventory_items(name), creator:profiles(full_name)')
      .order('created_at', { ascending: false }).limit(15);
    setRecentMovements(movements as InventoryMovement[] ?? []);
    setLoading(false);
  }, [filterCategory, showLowStock]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const lowStockCount = items.filter(i => i.current_stock <= i.minimum_stock).length;

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">
            {items.length} items
            {lowStockCount > 0 && <span className="ml-2 text-red-500 font-medium">· {lowStockCount} low stock</span>}
          </p>
        </div>
        {canManage(user?.role ?? '') && (
          <button onClick={() => { setEditItem(null); setShowItemModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
            <Plus size={16} /> New Item
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowLowStock(p => !p)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showLowStock ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          <TrendingDown size={14} /> Low Stock Only
          {lowStockCount > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{lowStockCount}</span>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {items.length === 0 ? (
            <EmptyState icon={PackageOpen} title="No inventory items" description="Add inventory items to track raw materials." />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Item</th>
                      <th className="text-left px-3 py-3">Category</th>
                      <th className="text-right px-3 py-3">Stock</th>
                      <th className="text-right px-3 py-3">Min</th>
                      <th className="text-right px-3 py-3 hidden lg:table-cell">Cost/Unit</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map(item => {
                      const isLow = item.current_stock <= item.minimum_stock;
                      return (
                        <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50/30' : ''}`}>
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            {item.supplier && <p className="text-xs text-gray-400">{item.supplier}</p>}
                          </td>
                          <td className="px-3 py-3 text-gray-500">{item.category}</td>
                          <td className="px-3 py-3 text-right">
                            <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{item.current_stock}</span>
                            <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                          </td>
                          <td className="px-3 py-3 text-right text-gray-400">{item.minimum_stock}</td>
                          <td className="px-3 py-3 text-right text-gray-500 hidden lg:table-cell">
                            {item.cost_per_unit ? `$${item.cost_per_unit}` : '—'}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setShowMovementModal(item)} className="px-2 py-1 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded font-medium">
                                Adjust
                              </button>
                              {canManage(user?.role ?? '') && (
                                <button onClick={() => { setEditItem(item); setShowItemModal(true); }} className="p-1.5 rounded hover:bg-gray-100">
                                  <Edit2 size={12} className="text-gray-400" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Recent Movements</h2>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-gray-400">No movements yet.</p>
          ) : (
            <div className="space-y-2">
              {recentMovements.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  {['Stock In'].includes(m.movement_type) ? (
                    <ArrowUp size={14} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <ArrowDown size={14} className="text-red-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{(m as any).item?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{m.movement_type} · {m.quantity} {m.unit ?? ''}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">{formatDate(m.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showItemModal && (
        <InventoryItemModal item={editItem} onClose={() => setShowItemModal(false)} onSaved={fetchAll} />
      )}
      {showMovementModal && (
        <MovementModal item={showMovementModal} onClose={() => setShowMovementModal(null)} onSaved={fetchAll} />
      )}
    </div>
  );
}

function InventoryItemModal({ item, onClose, onSaved }: { item: InventoryItem | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'Other',
    unit: item?.unit ?? 'kg',
    current_stock: item?.current_stock ?? 0,
    minimum_stock: item?.minimum_stock ?? 0,
    cost_per_unit: item?.cost_per_unit ?? '',
    supplier: item?.supplier ?? '',
    notes: item?.notes ?? '',
    is_active: item?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!form.name) return;
    setLoading(true);
    const data = { ...form, cost_per_unit: form.cost_per_unit ? +form.cost_per_unit : null, supplier: form.supplier || null };
    if (item) {
      await supabase.from('inventory_items').update({ ...data, updated_at: new Date().toISOString() }).eq('id', item.id);
    } else {
      await supabase.from('inventory_items').insert(data);
    }
    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={item ? 'Edit Item' : 'New Inventory Item'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
            <input type="number" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: +e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
            <input type="number" value={form.minimum_stock} onChange={e => setForm(f => ({ ...f, minimum_stock: +e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Cost/Unit ($)</label>
            <input type="number" value={form.cost_per_unit} onChange={e => setForm(f => ({ ...f, cost_per_unit: e.target.value }))} step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={loading || !form.name} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  );
}

function MovementModal({ item, onClose, onSaved }: { item: InventoryItem; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [type, setType] = useState<'Stock In' | 'Stock Out' | 'Adjustment'>('Stock In');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!quantity) return;
    setLoading(true);
    const qty = parseFloat(quantity);
    await supabase.from('inventory_movements').insert({
      item_id: item.id,
      movement_type: type,
      quantity: qty,
      unit: item.unit,
      notes: notes || null,
      created_by: user?.id,
    });

    let newStock = item.current_stock;
    if (type === 'Stock In') newStock += qty;
    else if (type === 'Stock Out') newStock = Math.max(0, newStock - qty);
    else newStock = qty;

    await supabase.from('inventory_items').update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq('id', item.id);
    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Adjust Stock: ${item.name}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Current stock: <strong>{item.current_stock} {item.unit}</strong></p>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
          <select value={type} onChange={e => setType(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="Stock In">Stock In</option>
            <option value="Stock Out">Stock Out</option>
            <option value="Adjustment">Set to Exact Amount</option>
          </select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity ({item.unit})</label>
          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={loading || !quantity} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Save</button>
        </div>
      </div>
    </Modal>
  );
}
