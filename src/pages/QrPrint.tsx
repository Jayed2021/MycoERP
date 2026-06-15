import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navigate } from '../hooks/useRoute';
import { buildQrPayload, getQrEntityTypeLabel, formatDate, getBatchTypeLabel } from '../lib/utils';
import { PageLoader } from '../components/LoadingSpinner';
import type { QrCode } from '../lib/types';

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

const DEFAULT_SIZE: LabelSize = { width: 2, height: 1.25, qr_size: 100, layout: 'horizontal' };
const DEFAULT_FIELDS: LabelFields = {
  show_batch_code: true, show_batch_type: true, show_species: true, show_strain: true,
  show_date: true, show_room: false, show_responsible: false, error_correction: 'M',
};

export default function QrPrint({ qrId }: { qrId: string }) {
  const [qrCode, setQrCode] = useState<QrCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [labelSize, setLabelSize] = useState<LabelSize>(DEFAULT_SIZE);
  const [labelFields, setLabelFields] = useState<LabelFields>(DEFAULT_FIELDS);
  const [allSizes, setAllSizes] = useState<Record<string, LabelSize>>({});
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('qr_codes').select('*').eq('id', qrId).single(),
      supabase.from('app_settings').select('key, value').in('key', ['label_sizes', 'label_fields']),
    ]).then(([qrRes, settingsRes]) => {
      const qr = qrRes.data as QrCode;
      setQrCode(qr);

      let sizes: Record<string, LabelSize> = {};
      let fields = DEFAULT_FIELDS;

      if (settingsRes.data) {
        for (const row of settingsRes.data) {
          if (row.key === 'label_sizes') sizes = row.value as Record<string, LabelSize>;
          if (row.key === 'label_fields') fields = row.value as LabelFields;
        }
      }
      setAllSizes(sizes);
      setLabelFields(fields);

      // If this QR is for a batch, look up the batch type to find the right label size
      if (qr?.entity_type === 'batch' && qr.entity_id) {
        supabase.from('batches').select('batch_type').eq('id', qr.entity_id).maybeSingle()
          .then(({ data }) => {
            const bt = data?.batch_type ?? '';
            setLabelSize(sizes[bt] ?? sizes['default'] ?? DEFAULT_SIZE);
          });
      } else {
        setLabelSize(sizes['default'] ?? DEFAULT_SIZE);
      }

      setLoading(false);
    });
  }, [qrId]);

  if (loading) return <PageLoader />;
  if (!qrCode) return (
    <div className="p-6 text-center">
      <p className="text-gray-500">QR Code not found.</p>
      <button onClick={() => navigate('/qr')} className="mt-3 text-emerald-600 hover:underline text-sm">Back to QR Manager</button>
    </div>
  );

  const qrValue = buildQrPayload(qrCode.qr_text, qrCode.entity_type, qrCode.label, qrCode.description ?? undefined);
  const widthMm = (labelSize.width * 25.4).toFixed(1);
  const heightMm = (labelSize.height * 25.4).toFixed(1);
  const previewW = labelSize.width * 96;
  const previewH = labelSize.height * 96;
  const qrPreviewSize = Math.min(labelSize.qr_size, previewH - 16);

  function handleDownloadPng() {
    const PRINT_DPI = 300;
    const widthPx = Math.round(labelSize.width * PRINT_DPI);
    const heightPx = Math.round(labelSize.height * PRINT_DPI);
    const qrPx = labelSize.qr_size * (PRINT_DPI / 96);

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    const svgEl = svgRef.current?.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    img.onload = () => {
      const padding = Math.round(heightPx * 0.06);
      const qrDrawSize = Math.min(qrPx, heightPx - padding * 2);

      if (labelSize.layout === 'vertical') {
        const qrX = (widthPx - qrDrawSize) / 2;
        ctx.drawImage(img, qrX, padding, qrDrawSize, qrDrawSize);
        const textY = padding + qrDrawSize + padding;
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'center';
        const fontSize = Math.max(Math.round(heightPx * 0.06), 14);
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.fillText(qrCode!.label, widthPx / 2, textY);
        ctx.font = `${Math.round(fontSize * 0.75)}px monospace`;
        ctx.fillStyle = '#6b7280';
        ctx.fillText(qrCode!.qr_text, widthPx / 2, textY + fontSize + 6);
      } else {
        const qrY = (heightPx - qrDrawSize) / 2;
        ctx.drawImage(img, padding, qrY, qrDrawSize, qrDrawSize);
        const textX = padding + qrDrawSize + padding;
        const fontSize = Math.max(Math.round(heightPx * 0.09), 14);
        let textY = heightPx * 0.35;
        ctx.textAlign = 'left';
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.fillStyle = '#111827';
        ctx.fillText(qrCode!.label, textX, textY, widthPx - textX - padding);
        textY += fontSize + 6;
        ctx.font = `${Math.round(fontSize * 0.75)}px monospace`;
        ctx.fillStyle = '#6b7280';
        ctx.fillText(qrCode!.qr_text, textX, textY, widthPx - textX - padding);
        textY += fontSize;
        ctx.font = `${Math.round(fontSize * 0.7)}px system-ui, sans-serif`;
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(getQrEntityTypeLabel(qrCode!.entity_type), textX, textY, widthPx - textX - padding);
        textY += fontSize - 2;
        ctx.fillText(formatDate(qrCode!.created_at), textX, textY, widthPx - textX - padding);
      }

      const a = document.createElement('a');
      a.download = `label-${qrCode!.qr_text}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Screen controls */}
      <div className="print:hidden mb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/qr')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Print QR Label</h1>
        </div>

        {/* Size selector - use configured sizes */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(allSizes).map(([key, sz]) => (
            <button
              key={key}
              onClick={() => setLabelSize(sz)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                labelSize.width === sz.width && labelSize.height === sz.height
                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                  : 'text-gray-600 hover:bg-gray-100 bg-gray-50'
              }`}
            >
              {key === 'default' ? 'Default' : getBatchTypeLabel(key)} ({sz.width}" x {sz.height}")
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
          >
            <Printer size={16} /> Print Label
          </button>
          <button
            onClick={handleDownloadPng}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg"
          >
            <Download size={16} /> Download PNG
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Current size: {labelSize.width}" x {labelSize.height}" ({widthMm}mm x {heightMm}mm) -- Configure sizes in App Settings
        </p>
      </div>

      {/* Print-optimized label */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-label, #qr-label * { visibility: visible; }
          #qr-label { position: fixed; top: 0; left: 0; }
          @page { margin: 0; size: ${widthMm}mm ${heightMm}mm; }
        }
      `}</style>

      <div
        ref={svgRef}
        id="qr-label"
        className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden"
        style={{ width: `${previewW}px`, height: `${previewH}px`, padding: '8px' }}
      >
        <div className={`w-full h-full flex ${labelSize.layout === 'vertical' ? 'flex-col items-center justify-center' : 'items-center gap-3'}`}>
          <div className="flex-shrink-0">
            <QRCodeSVG
              value={qrValue}
              size={qrPreviewSize}
              level={labelFields.error_correction}
              includeMargin={false}
            />
          </div>
          <div className={`min-w-0 ${labelSize.layout === 'vertical' ? 'text-center mt-1' : 'flex-1'}`}>
            <p className="font-bold text-gray-900 leading-tight truncate" style={{ fontSize: previewH > 100 ? '12px' : '9px' }}>
              {qrCode.label}
            </p>
            <p className="text-gray-500 font-mono leading-snug mt-0.5 truncate" style={{ fontSize: previewH > 100 ? '9px' : '7px' }}>
              {qrCode.qr_text}
            </p>
            <p className="text-gray-400 mt-0.5 truncate" style={{ fontSize: previewH > 100 ? '8px' : '7px' }}>
              {getQrEntityTypeLabel(qrCode.entity_type)}
            </p>
            <p className="text-gray-400" style={{ fontSize: previewH > 100 ? '8px' : '6px' }}>
              {formatDate(qrCode.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Preview helper */}
      <div className="print:hidden mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
        <p>Click Print and select your label printer. The page size is set to match your configured label dimensions.</p>
        <p className="mt-1 font-mono text-gray-400">{qrCode.qr_text}</p>
      </div>
    </div>
  );
}
