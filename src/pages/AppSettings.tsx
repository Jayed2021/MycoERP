import { useEffect, useState } from 'react';
import { Settings, Save, Check, Tag, Ruler } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PageLoader } from '../components/LoadingSpinner';
import { getBatchTypeLabel } from '../lib/utils';

interface LabelSize {
  width: number;
  height: number;
  qr_size: number;
  layout: 'horizontal' | 'vertical';
}

interface LabelFields {
  show_batch_code: boolean;
  show_batch_type: boolean;
  show_species: boolean;
  show_strain: boolean;
  show_date: boolean;
  show_room: boolean;
  show_responsible: boolean;
  error_correction: 'L' | 'M' | 'Q' | 'H';
}

interface GeneralSettings {
  farm_name: string;
  auto_generate_qr_on_batch_create: boolean;
}

const BATCH_TYPES = ['agar', 'liquid_culture', 'grain_spawn', 'substrate', 'fruiting_block', 'harvest', 'default'];
const DPI = 96;

export default function AppSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'labels' | 'general'>('labels');
  const [selectedType, setSelectedType] = useState('agar');

  const [labelSizes, setLabelSizes] = useState<Record<string, LabelSize>>({});
  const [labelFields, setLabelFields] = useState<LabelFields>({
    show_batch_code: true,
    show_batch_type: true,
    show_species: true,
    show_strain: true,
    show_date: true,
    show_room: false,
    show_responsible: false,
    error_correction: 'M',
  });
  const [general, setGeneral] = useState<GeneralSettings>({
    farm_name: 'MycoERP Farm',
    auto_generate_qr_on_batch_create: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from('app_settings').select('key, value');
    if (data) {
      for (const row of data) {
        if (row.key === 'label_sizes') setLabelSizes(row.value as Record<string, LabelSize>);
        if (row.key === 'label_fields') setLabelFields(row.value as LabelFields);
        if (row.key === 'general') setGeneral(row.value as GeneralSettings);
      }
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    await Promise.all([
      supabase.from('app_settings').upsert({ key: 'label_sizes', value: labelSizes, updated_at: new Date().toISOString(), updated_by: user?.id }),
      supabase.from('app_settings').upsert({ key: 'label_fields', value: labelFields, updated_at: new Date().toISOString(), updated_by: user?.id }),
      supabase.from('app_settings').upsert({ key: 'general', value: general, updated_at: new Date().toISOString(), updated_by: user?.id }),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateSize(field: keyof LabelSize, value: number | string) {
    setLabelSizes(prev => ({
      ...prev,
      [selectedType]: {
        ...prev[selectedType],
        [field]: field === 'layout' ? value : parseFloat(value as string) || 0,
      },
    }));
    setSaved(false);
  }

  function toggleField(field: keyof LabelFields) {
    if (field === 'error_correction') return;
    setLabelFields(prev => ({ ...prev, [field]: !prev[field] }));
    setSaved(false);
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium">Admin access required to manage settings.</p>
        </div>
      </div>
    );
  }

  if (loading) return <PageLoader />;

  const currentSize = labelSizes[selectedType] ?? labelSizes['default'] ?? { width: 2, height: 1.25, qr_size: 100, layout: 'horizontal' };
  const previewWidthPx = currentSize.width * DPI;
  const previewHeightPx = currentSize.height * DPI;

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Settings size={20} className="text-slate-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">App Settings</h1>
            <p className="text-sm text-gray-500">Configure system-wide preferences</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-lg transition-colors"
        >
          {saved ? <Check size={14} /> : <Save size={14} />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('labels')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'labels' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Tag size={14} /> Label & Barcode
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Settings size={14} /> General
          </button>
        </div>
      </div>

      {activeTab === 'labels' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Batch Type Selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Ruler size={15} /> Label Size per Batch Type
              </h3>
              <div className="flex flex-wrap gap-2 mb-5">
                {BATCH_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedType === t
                        ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {t === 'default' ? 'Default (Others)' : getBatchTypeLabel(t)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Width (inches)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.5"
                    max="6"
                    value={currentSize.width}
                    onChange={e => updateSize('width', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Height (inches)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.5"
                    max="4"
                    value={currentSize.height}
                    onChange={e => updateSize('height', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">QR Size (px)</label>
                  <input
                    type="number"
                    step="10"
                    min="40"
                    max="300"
                    value={currentSize.qr_size}
                    onChange={e => updateSize('qr_size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Layout</label>
                  <select
                    value={currentSize.layout}
                    onChange={e => updateSize('layout', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-3">
                Actual print size: {currentSize.width}" x {currentSize.height}" ({(currentSize.width * 25.4).toFixed(0)}mm x {(currentSize.height * 25.4).toFixed(0)}mm)
              </p>
            </div>

            {/* Label Fields */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Fields Shown on Label</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {([
                  ['show_batch_code', 'Batch Code'],
                  ['show_batch_type', 'Batch Type'],
                  ['show_species', 'Species Name'],
                  ['show_strain', 'Strain Code'],
                  ['show_date', 'Start Date'],
                  ['show_room', 'Room Name'],
                  ['show_responsible', 'Responsible Person'],
                ] as [keyof LabelFields, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labelFields[key] as boolean}
                      onChange={() => toggleField(key)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Error Correction Level</label>
                <select
                  value={labelFields.error_correction}
                  onChange={e => { setLabelFields(f => ({ ...f, error_correction: e.target.value as any })); setSaved(false); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="L">Low (7% recovery)</option>
                  <option value="M">Medium (15% recovery)</option>
                  <option value="Q">Quartile (25% recovery)</option>
                  <option value="H">High (30% recovery)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Higher = more scannable when damaged, but denser QR code</p>
              </div>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Live Preview</h3>
              <p className="text-xs text-gray-400 mb-3">{getBatchTypeLabel(selectedType === 'default' ? 'other' : selectedType)} label at screen scale</p>

              <div className="flex justify-center">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden"
                  style={{
                    width: `${Math.min(previewWidthPx, 320)}px`,
                    height: `${Math.min(previewHeightPx, 250)}px`,
                    padding: '6px',
                  }}
                >
                  <div className={`w-full h-full flex ${currentSize.layout === 'vertical' ? 'flex-col items-center' : 'items-center gap-2'}`}>
                    <div className="flex-shrink-0">
                      <QRCodeSVG
                        value="QR-BATCH-AP-1234"
                        size={Math.min(currentSize.qr_size * 0.6, previewHeightPx - 16)}
                        level={labelFields.error_correction}
                        includeMargin={false}
                      />
                    </div>
                    <div className={`min-w-0 ${currentSize.layout === 'vertical' ? 'text-center mt-1' : ''}`}>
                      {labelFields.show_batch_code && (
                        <p className="font-bold text-gray-900 leading-tight truncate" style={{ fontSize: '9px' }}>AP-1234</p>
                      )}
                      {labelFields.show_batch_type && (
                        <p className="text-gray-500 leading-tight truncate" style={{ fontSize: '7px' }}>Agar Plate</p>
                      )}
                      {labelFields.show_species && (
                        <p className="text-gray-500 leading-tight truncate" style={{ fontSize: '7px' }}>P. ostreatus</p>
                      )}
                      {labelFields.show_strain && (
                        <p className="text-gray-400 font-mono leading-tight truncate" style={{ fontSize: '6px' }}>PO-01</p>
                      )}
                      {labelFields.show_date && (
                        <p className="text-gray-400 leading-tight" style={{ fontSize: '6px' }}>2026-06-15</p>
                      )}
                      {labelFields.show_room && (
                        <p className="text-gray-400 leading-tight truncate" style={{ fontSize: '6px' }}>Lab A</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="space-y-1 text-xs text-gray-500">
                  <p>Print size: <span className="font-medium text-gray-700">{currentSize.width}" x {currentSize.height}"</span></p>
                  <p>QR code: <span className="font-medium text-gray-700">{currentSize.qr_size}px at 300DPI</span></p>
                  <p>Layout: <span className="font-medium text-gray-700 capitalize">{currentSize.layout}</span></p>
                  <p>Correction: <span className="font-medium text-gray-700">{labelFields.error_correction}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label>
              <input
                type="text"
                value={general.farm_name}
                onChange={e => { setGeneral(g => ({ ...g, farm_name: e.target.value })); setSaved(false); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Displayed in reports and labels</p>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={general.auto_generate_qr_on_batch_create}
                  onChange={e => { setGeneral(g => ({ ...g, auto_generate_qr_on_batch_create: e.target.checked })); setSaved(false); }}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">Auto-generate QR code on batch creation</p>
                  <p className="text-xs text-gray-400">When enabled, a QR code is created automatically for every new batch and a download dialog is shown</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
