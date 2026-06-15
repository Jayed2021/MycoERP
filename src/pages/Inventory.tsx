import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, PackageOpen, TrendingDown, Edit2, ArrowUp, ArrowDown, QrCode, Download, Printer, ScanLine, ClipboardCheck, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, formatDateTime, generateQrText, buildQrPayload } from '../lib/utils';
import { navigate } from '../hooks/useRoute';
import type { InventoryItem, InventoryMovement, InventoryAudit, InventoryAuditLine } from '../lib/types';

const CATEGORIES = ['Grain', 'Substrate', 'Supplement', 'Packaging', 'Lab Supply', 'Cleaning Supply', 'Equipment Part', 'Other'];

export default function Inventory() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { canEdit, canApprove } = usePermissions();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState<InventoryItem | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState<InventoryItem | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [recentMovements, setRecentMovements] = useState<InventoryMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'stock' | 'audits'>('stock');

  const fetchAll = useCallback(async () => {
    let q = supabase.from('inventory_items').select('*').eq('is_active', true).order('category').order('name');
    if (filterCategory) q = q.eq('category', filterCategory);
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
          <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
          <p className="text-sm text-gray-500">
            {items.length} items
            {lowStockCount > 0 && <span className="ml-2 text-red-500 font-medium">· {lowStockCount} low stock</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'stock' && (
            <>
              <button onClick={() => navigate('#/scan?context=inventory')}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg">
                <ScanLine size={16} /> Scan to Adjust
              </button>
              {canEdit('inventory') && (
                <button onClick={() => { setEditItem(null); setShowItemModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
                  <Plus size={16} /> {t('inventory.newItem')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        <button onClick={() => setActiveTab('stock')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stock' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Stock
        </button>
        <button onClick={() => setActiveTab('audits')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'audits' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Audits
        </button>
      </div>

      {activeTab === 'stock' ? (
        <StockTab
          items={items}
          lowStockCount={lowStockCount}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          showLowStock={showLowStock}
          setShowLowStock={setShowLowStock}
          recentMovements={recentMovements}
          canEdit={canEdit}
          setShowMovementModal={setShowMovementModal}
          setShowBarcodeModal={setShowBarcodeModal}
          setEditItem={setEditItem}
          setShowItemModal={setShowItemModal}
          t={t}
        />
      ) : (
        <AuditsTab items={items} onRefresh={fetchAll} />
      )}

      {showItemModal && (
        <InventoryItemModal item={editItem} onClose={() => setShowItemModal(false)} onSaved={fetchAll} />
      )}
      {showMovementModal && (
        <MovementModal item={showMovementModal} onClose={() => setShowMovementModal(null)} onSaved={fetchAll} />
      )}
      {showBarcodeModal && (
        <BarcodeModal item={showBarcodeModal} onClose={() => setShowBarcodeModal(null)} onUpdated={fetchAll} />
      )}
    </div>
  );
}

function StockTab({ items, lowStockCount, filterCategory, setFilterCategory, showLowStock, setShowLowStock, recentMovements, canEdit, setShowMovementModal, setShowBarcodeModal, setEditItem, setShowItemModal, t }: any) {
  return (
    <>
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterCategory} onChange={(e: any) => setFilterCategory(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">{t('inventory.allCategories')}</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowLowStock((p: boolean) => !p)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showLowStock ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          <TrendingDown size={14} /> Low Stock Only
          {lowStockCount > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{lowStockCount}</span>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {items.length === 0 ? (
            <EmptyState icon={PackageOpen} title={t('inventory.noItems')} description={t('inventory.noItemsDesc')} />
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
                    {items.map((item: InventoryItem) => {
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
                            {item.cost_per_unit ? `$${item.cost_per_unit}` : '\u2014'}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setShowBarcodeModal(item)} className="p-1.5 rounded hover:bg-gray-100" title="QR Code">
                                <QrCode size={14} className="text-gray-500" />
                              </button>
                              <button onClick={() => setShowMovementModal(item)} className="px-2 py-1 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded font-medium">
                                Adjust
                              </button>
                              {canEdit('inventory') && (
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

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Recent Movements</h2>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-gray-400">No movements yet.</p>
          ) : (
            <div className="space-y-2">
              {recentMovements.map((m: any) => (
                <div key={m.id} className="flex items-center gap-2">
                  {['Stock In'].includes(m.movement_type) ? (
                    <ArrowUp size={14} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <ArrowDown size={14} className="text-red-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{m.item?.name ?? '\u2014'}</p>
                    <p className="text-xs text-gray-400">{m.movement_type} · {m.quantity} {m.unit ?? ''}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">{formatDate(m.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Barcode Modal ---
function BarcodeModal({ item, onClose, onUpdated }: { item: InventoryItem; onClose: () => void; onUpdated: () => void }) {
  const { user } = useAuth();
  const [barcodeText, setBarcodeText] = useState(item.barcode_text ?? '');
  const [loading, setLoading] = useState(!item.barcode_text);
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item.barcode_text) {
      generateBarcode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateBarcode() {
    setLoading(true);
    const qrText = generateQrText('inventory_item', item.name);

    await supabase.from('inventory_items').update({ barcode_text: qrText, updated_at: new Date().toISOString() }).eq('id', item.id);

    await supabase.from('qr_codes').insert({
      qr_text: qrText,
      entity_type: 'inventory_item',
      entity_id: item.id,
      label: item.name,
      description: `Inventory: ${item.category} - ${item.name}`,
      status: 'Active',
      created_by: user?.id ?? null,
    });

    setBarcodeText(qrText);
    setLoading(false);
    onUpdated();
  }

  function downloadPng() {
    const svgEl = svgRef.current?.querySelector('svg');
    if (!svgEl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      const a = document.createElement('a');
      a.download = `${item.name.replace(/\s+/g, '-')}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
  }

  function printLabel() {
    const payload = buildQrPayload(barcodeText, 'inventory_item', item.name, item.category);
    const svgEl = svgRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Print Label</title><style>
      body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; }
      .label { text-align: center; padding: 16px; border: 1px dashed #ccc; }
      .label h3 { margin: 8px 0 4px; font-size: 14px; }
      .label p { margin: 0; font-size: 11px; color: #666; }
      .label .code { font-family: monospace; font-size: 10px; color: #999; margin-top: 6px; }
      @media print { .label { border: none; } }
    </style></head><body>
      <div class="label">
        ${svgData}
        <h3>${item.name}</h3>
        <p>${item.category} · ${item.unit}</p>
        <p class="code">${barcodeText}</p>
      </div>
      <script>setTimeout(()=>{ window.print(); window.close(); }, 300);</script>
    </body></html>`);
    printWindow.document.close();
  }

  return (
    <Modal open onClose={onClose} title={`QR Code: ${item.name}`} size="sm">
      <div className="flex flex-col items-center py-4">
        {loading ? (
          <div className="w-48 h-48 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-400">Generating...</p>
          </div>
        ) : (
          <>
            <div ref={svgRef} className="p-4 bg-white border border-gray-100 rounded-lg">
              <QRCodeSVG value={buildQrPayload(barcodeText, 'inventory_item', item.name, item.category)} size={180} level="M" />
            </div>
            <p className="mt-3 text-xs font-mono text-gray-500">{barcodeText}</p>
            <p className="text-sm text-gray-600 mt-1">{item.category} · {item.unit}</p>
            <div className="flex gap-2 mt-5">
              <button onClick={downloadPng} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                <Download size={14} /> Download PNG
              </button>
              <button onClick={printLabel} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                <Printer size={14} /> Print Label
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// --- Audits Tab ---
function AuditsTab({ items, onRefresh }: { items: InventoryItem[]; onRefresh: () => void }) {
  const { user } = useAuth();
  const { canApprove } = usePermissions();
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAudit, setActiveAudit] = useState<InventoryAudit | null>(null);
  const [viewAudit, setViewAudit] = useState<InventoryAudit | null>(null);
  const [showNewAuditPrompt, setShowNewAuditPrompt] = useState(false);

  const fetchAudits = useCallback(async () => {
    const { data } = await supabase.from('inventory_audits')
      .select('*, conductor:profiles!conducted_by(full_name)')
      .order('created_at', { ascending: false });
    setAudits(data as InventoryAudit[] ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAudits(); }, [fetchAudits]);

  async function startAudit(title: string) {
    const activeItems = items.filter(i => i.is_active);
    const { data: audit } = await supabase.from('inventory_audits').insert({
      title,
      conducted_by: user?.id,
      status: 'In Progress',
      total_items: activeItems.length,
      items_counted: 0,
      discrepancies_found: 0,
    }).select().single();

    if (!audit) return;

    const lines = activeItems.map(item => ({
      audit_id: audit.id,
      item_id: item.id,
      expected_stock: item.current_stock,
    }));
    await supabase.from('inventory_audit_lines').insert(lines);
    setShowNewAuditPrompt(false);
    setActiveAudit(audit as InventoryAudit);
    fetchAudits();
  }

  if (loading) return <PageLoader />;

  if (activeAudit) {
    return <AuditCountingView audit={activeAudit} onDone={() => { setActiveAudit(null); fetchAudits(); onRefresh(); }} />;
  }

  if (viewAudit) {
    return <AuditDetailView audit={viewAudit} onBack={() => { setViewAudit(null); fetchAudits(); }} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{audits.length} audit{audits.length !== 1 ? 's' : ''} on record</p>
        {canApprove('inventory') && (
          <button onClick={() => setShowNewAuditPrompt(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
            <ClipboardCheck size={16} /> Start New Audit
          </button>
        )}
      </div>

      {audits.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No audits yet" description="Start a new audit to count your physical inventory and reconcile discrepancies." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Audit</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3 hidden md:table-cell">Conducted By</th>
                <th className="text-right px-3 py-3">Counted</th>
                <th className="text-right px-3 py-3">Discrepancies</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {audits.map(audit => (
                <tr key={audit.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                  if (audit.status === 'In Progress') setActiveAudit(audit);
                  else setViewAudit(audit);
                }}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{audit.title}</p>
                    <p className="text-xs text-gray-400">{formatDate(audit.audit_date)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge label={audit.status} type="custom" color={audit.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : audit.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'} />
                  </td>
                  <td className="px-3 py-3 text-gray-500 hidden md:table-cell">{(audit as any).conductor?.full_name ?? '\u2014'}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{audit.items_counted}/{audit.total_items}</td>
                  <td className="px-3 py-3 text-right">
                    {audit.discrepancies_found > 0 ? (
                      <span className="text-amber-600 font-medium">{audit.discrepancies_found}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3"><ChevronRight size={14} className="text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewAuditPrompt && (
        <NewAuditModal onClose={() => setShowNewAuditPrompt(false)} onStart={startAudit} />
      )}
    </div>
  );
}

function NewAuditModal({ onClose, onStart }: { onClose: () => void; onStart: (title: string) => void }) {
  const [title, setTitle] = useState(`Audit - ${new Date().toLocaleDateString()}`);
  return (
    <Modal open onClose={onClose} title="Start New Audit" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">This will snapshot all active inventory items for physical counting. Expected stock will be hidden during the count (blind audit).</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Audit Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={() => onStart(title)} disabled={!title.trim()} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">Start Audit</button>
        </div>
      </div>
    </Modal>
  );
}

// --- Audit Counting View ---
function AuditCountingView({ audit, onDone }: { audit: InventoryAudit; onDone: () => void }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<(InventoryAuditLine & { item?: InventoryItem })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpected, setShowExpected] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchLines = useCallback(async () => {
    const { data } = await supabase.from('inventory_audit_lines')
      .select('*, item:inventory_items(id, name, category, unit, current_stock)')
      .eq('audit_id', audit.id)
      .order('item_id');
    setLines(data as any ?? []);
    setLoading(false);
  }, [audit.id]);

  useEffect(() => { fetchLines(); }, [fetchLines]);

  const countedCount = lines.filter(l => l.counted_stock !== null).length;
  const discrepancyCount = lines.filter(l => l.counted_stock !== null && l.discrepancy !== null && l.discrepancy !== 0).length;

  async function saveCount(lineId: string, countedStock: number) {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    const discrepancy = countedStock - line.expected_stock;
    await supabase.from('inventory_audit_lines').update({
      counted_stock: countedStock,
      discrepancy,
      counted_by: user?.id,
      counted_at: new Date().toISOString(),
    }).eq('id', lineId);

    const newCounted = lines.filter(l => l.id === lineId ? true : l.counted_stock !== null).length;
    const newDiscrepancies = lines.reduce((sum, l) => {
      if (l.id === lineId) return sum + (discrepancy !== 0 ? 1 : 0);
      return sum + (l.counted_stock !== null && l.discrepancy !== null && l.discrepancy !== 0 ? 1 : 0);
    }, 0);

    await supabase.from('inventory_audits').update({
      items_counted: newCounted,
      discrepancies_found: newDiscrepancies,
    }).eq('id', audit.id);

    fetchLines();
  }

  async function completeAudit(applyAdjustments: boolean) {
    if (applyAdjustments) {
      const discrepantLines = lines.filter(l => l.counted_stock !== null && l.discrepancy !== null && l.discrepancy !== 0);
      for (const line of discrepantLines) {
        await supabase.from('inventory_movements').insert({
          item_id: line.item_id,
          movement_type: 'Adjustment',
          quantity: line.counted_stock!,
          unit: line.item?.unit ?? null,
          notes: `Audit adjustment - ${audit.title}`,
          created_by: user?.id,
        });
        await supabase.from('inventory_items').update({
          current_stock: line.counted_stock!,
          updated_at: new Date().toISOString(),
        }).eq('id', line.item_id);
        await supabase.from('inventory_audit_lines').update({ adjustment_applied: true }).eq('id', line.id);
      }
    }

    await supabase.from('inventory_audits').update({
      status: 'Completed',
      completed_at: new Date().toISOString(),
    }).eq('id', audit.id);

    onDone();
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <button onClick={onDone} className="text-sm text-gray-500 hover:text-gray-700 mb-1">&larr; Back to Audits</button>
          <h2 className="text-lg font-bold text-gray-900">{audit.title}</h2>
        </div>
        <button onClick={() => setShowCompleteModal(true)} disabled={countedCount < lines.length}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 rounded-lg">
          Complete Audit
        </button>
      </div>

      {/* Summary Bar */}
      <div className="flex flex-wrap gap-4 mb-5 p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check size={14} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Counted</p>
            <p className="text-sm font-semibold">{countedCount} / {lines.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={14} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Discrepancies</p>
            <p className="text-sm font-semibold">{discrepancyCount}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showExpected} onChange={e => setShowExpected(e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            Show Expected Qty
          </label>
        </div>
      </div>

      {/* Counting List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Item</th>
                <th className="text-left px-3 py-3">Category</th>
                {showExpected && <th className="text-right px-3 py-3">Expected</th>}
                <th className="text-right px-3 py-3 w-36">Counted</th>
                {showExpected && <th className="text-right px-3 py-3">Discrepancy</th>}
                <th className="px-3 py-3 w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map(line => {
                const isCounted = line.counted_stock !== null;
                const hasDiscrepancy = isCounted && line.discrepancy !== null && line.discrepancy !== 0;
                return (
                  <tr key={line.id} className={`${isCounted ? (hasDiscrepancy ? 'bg-amber-50/40' : 'bg-emerald-50/30') : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{line.item?.name ?? '\u2014'}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{line.item?.category ?? ''}</td>
                    {showExpected && (
                      <td className="px-3 py-3 text-right text-gray-500">{line.expected_stock} <span className="text-xs text-gray-400">{line.item?.unit}</span></td>
                    )}
                    <td className="px-3 py-3 text-right">
                      <CountInput
                        ref={(el: HTMLInputElement | null) => { inputRefs.current[line.id] = el; }}
                        defaultValue={line.counted_stock}
                        unit={line.item?.unit ?? ''}
                        onSave={(val) => saveCount(line.id, val)}
                      />
                    </td>
                    {showExpected && (
                      <td className="px-3 py-3 text-right">
                        {isCounted ? (
                          <span className={`font-semibold ${hasDiscrepancy ? (line.discrepancy! > 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400'}`}>
                            {line.discrepancy! > 0 ? '+' : ''}{line.discrepancy}
                          </span>
                        ) : '\u2014'}
                      </td>
                    )}
                    <td className="px-3 py-3 text-center">
                      {isCounted ? (
                        hasDiscrepancy ? (
                          <span className="inline-flex w-5 h-5 rounded-full bg-amber-200 items-center justify-center"><AlertTriangle size={10} className="text-amber-700" /></span>
                        ) : (
                          <span className="inline-flex w-5 h-5 rounded-full bg-emerald-200 items-center justify-center"><Check size={10} className="text-emerald-700" /></span>
                        )
                      ) : (
                        <span className="inline-block w-5 h-5 rounded-full border-2 border-gray-200" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCompleteModal && (
        <CompleteAuditModal
          discrepancies={lines.filter(l => l.counted_stock !== null && l.discrepancy !== null && l.discrepancy !== 0)}
          onClose={() => setShowCompleteModal(false)}
          onComplete={completeAudit}
        />
      )}
    </div>
  );
}

const CountInput = React.forwardRef<HTMLInputElement, { defaultValue: number | null; unit: string; onSave: (val: number) => void }>(
  ({ defaultValue, unit, onSave }, ref) => {
    const [value, setValue] = useState(defaultValue !== null ? String(defaultValue) : '');
    const [saved, setSaved] = useState(defaultValue !== null);

    function handleSave() {
      if (value === '' || isNaN(parseFloat(value))) return;
      onSave(parseFloat(value));
      setSaved(true);
    }

    return (
      <div className="flex items-center gap-1 justify-end">
        <input
          ref={ref}
          type="number"
          value={value}
          onChange={e => { setValue(e.target.value); setSaved(false); }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          min="0"
          step="0.01"
          className={`w-20 px-2 py-1 border rounded text-sm text-right outline-none focus:ring-2 focus:ring-emerald-500 ${saved ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300'}`}
        />
        <span className="text-xs text-gray-400">{unit}</span>
        {!saved && value !== '' && (
          <button onClick={handleSave} className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700">
            <Check size={12} />
          </button>
        )}
      </div>
    );
  }
);

function CompleteAuditModal({ discrepancies, onClose, onComplete }: { discrepancies: (InventoryAuditLine & { item?: InventoryItem })[]; onClose: () => void; onComplete: (apply: boolean) => void }) {
  const [applying, setApplying] = useState(false);

  async function handleApply(apply: boolean) {
    setApplying(true);
    await onComplete(apply);
  }

  return (
    <Modal open onClose={onClose} title="Complete Audit" size="lg">
      <div className="space-y-4">
        {discrepancies.length === 0 ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-700 font-medium">No discrepancies found. All items match expected stock.</p>
          </div>
        ) : (
          <>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700 font-medium">{discrepancies.length} discrepanc{discrepancies.length === 1 ? 'y' : 'ies'} found. Review below and choose whether to apply adjustments.</p>
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-xs font-semibold text-gray-500 uppercase">
                    <th className="text-left px-4 py-2">Item</th>
                    <th className="text-right px-4 py-2">Expected</th>
                    <th className="text-right px-4 py-2">Counted</th>
                    <th className="text-right px-4 py-2">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {discrepancies.map(line => (
                    <tr key={line.id}>
                      <td className="px-4 py-2 text-gray-900">{line.item?.name ?? '\u2014'}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{line.expected_stock}</td>
                      <td className="px-4 py-2 text-right font-medium">{line.counted_stock}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${line.discrepancy! > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {line.discrepancy! > 0 ? '+' : ''}{line.discrepancy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={applying} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
          {discrepancies.length > 0 && (
            <button onClick={() => handleApply(false)} disabled={applying} className="px-4 py-2 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg">
              Complete Without Adjusting
            </button>
          )}
          <button onClick={() => handleApply(discrepancies.length > 0)} disabled={applying}
            className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg">
            {discrepancies.length > 0 ? 'Apply Adjustments & Complete' : 'Complete Audit'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// --- Audit Detail View (read-only) ---
function AuditDetailView({ audit, onBack }: { audit: InventoryAudit; onBack: () => void }) {
  const [lines, setLines] = useState<(InventoryAuditLine & { item?: InventoryItem })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('inventory_audit_lines')
      .select('*, item:inventory_items(id, name, category, unit)')
      .eq('audit_id', audit.id)
      .order('item_id')
      .then(({ data }) => { setLines(data as any ?? []); setLoading(false); });
  }, [audit.id]);

  const discrepantLines = lines.filter(l => l.discrepancy !== null && l.discrepancy !== 0);

  if (loading) return <PageLoader />;

  return (
    <div>
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 mb-3">&larr; Back to Audits</button>
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3">{audit.title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDateTime(audit.audit_date)}</span></div>
          <div><span className="text-gray-500">Status:</span> <StatusBadge label={audit.status} type="custom" color="bg-emerald-100 text-emerald-700" /></div>
          <div><span className="text-gray-500">Items:</span> <span className="font-medium">{audit.items_counted}/{audit.total_items}</span></div>
          <div><span className="text-gray-500">Discrepancies:</span> <span className={`font-medium ${audit.discrepancies_found > 0 ? 'text-amber-600' : ''}`}>{audit.discrepancies_found}</span></div>
          {audit.completed_at && <div><span className="text-gray-500">Completed:</span> <span className="font-medium">{formatDateTime(audit.completed_at)}</span></div>}
        </div>
      </div>

      {discrepantLines.length > 0 && (
        <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">{discrepantLines.length} item{discrepantLines.length !== 1 ? 's' : ''} had discrepancies. {discrepantLines.some(l => l.adjustment_applied) ? 'Adjustments were applied.' : 'No adjustments were applied.'}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Item</th>
                <th className="text-left px-3 py-3">Category</th>
                <th className="text-right px-3 py-3">Expected</th>
                <th className="text-right px-3 py-3">Counted</th>
                <th className="text-right px-3 py-3">Discrepancy</th>
                <th className="text-left px-3 py-3">Notes</th>
                <th className="px-3 py-3">Adjusted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map(line => {
                const hasDiscrepancy = line.discrepancy !== null && line.discrepancy !== 0;
                return (
                  <tr key={line.id} className={hasDiscrepancy ? 'bg-amber-50/40' : ''}>
                    <td className="px-5 py-3 font-medium text-gray-900">{line.item?.name ?? '\u2014'}</td>
                    <td className="px-3 py-3 text-gray-500">{line.item?.category}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{line.expected_stock}</td>
                    <td className="px-3 py-3 text-right font-medium">{line.counted_stock ?? '\u2014'}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${hasDiscrepancy ? (line.discrepancy! > 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400'}`}>
                      {line.discrepancy !== null ? (line.discrepancy > 0 ? '+' : '') + line.discrepancy : '\u2014'}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{line.notes ?? ''}</td>
                    <td className="px-3 py-3 text-center">
                      {line.adjustment_applied ? <Check size={14} className="text-emerald-600 mx-auto" /> : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Existing Modals ---
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
