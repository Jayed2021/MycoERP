import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Download, Printer, ArrowRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { buildQrPayload, getBatchTypeLabel } from '../lib/utils';

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

interface BatchInfo {
  id: string;
  batch_code: string;
  batch_type: string;
  species_name?: string;
  strain_code?: string;
  start_date: string;
  room_name?: string;
}

interface Props {
  batch: BatchInfo;
  qrText: string;
  onClose: () => void;
  onGoToBatch: () => void;
}

const PRINT_DPI = 300;

export function BatchCreatedDialog({ batch, qrText, onClose, onGoToBatch }: Props) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [labelSize, setLabelSize] = useState<LabelSize>({ width: 2, height: 1.25, qr_size: 100, layout: 'horizontal' });
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

  useEffect(() => {
    supabase.from('app_settings').select('key, value').in('key', ['label_sizes', 'label_fields'])
      .then(({ data }) => {
        if (data) {
          for (const row of data) {
            if (row.key === 'label_sizes') {
              const sizes = row.value as Record<string, LabelSize>;
              setLabelSize(sizes[batch.batch_type] ?? sizes['default'] ?? labelSize);
            }
            if (row.key === 'label_fields') {
              setLabelFields(row.value as LabelFields);
            }
          }
        }
      });
  }, [batch.batch_type]);

  const qrValue = buildQrPayload(
    qrText,
    'batch',
    batch.batch_code,
    `${getBatchTypeLabel(batch.batch_type)}${batch.species_name ? ' — ' + batch.species_name : ''}`,
    batch.start_date
  );

  function getVisibleLines(): string[] {
    const lines: string[] = [];
    if (labelFields.show_batch_code) lines.push(batch.batch_code);
    if (labelFields.show_batch_type) lines.push(getBatchTypeLabel(batch.batch_type));
    if (labelFields.show_species && batch.species_name) lines.push(batch.species_name);
    if (labelFields.show_strain && batch.strain_code) lines.push(batch.strain_code);
    if (labelFields.show_date) lines.push(batch.start_date);
    if (labelFields.show_room && batch.room_name) lines.push(batch.room_name);
    return lines;
  }

  function handleDownload() {
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
        const lines = getVisibleLines();
        const fontSize = Math.max(Math.round(heightPx * 0.06), 14);
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        lines.forEach((line, i) => {
          if (i === 0) {
            ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
            ctx.fillStyle = '#111827';
          } else {
            ctx.font = `${Math.round(fontSize * 0.8)}px system-ui, sans-serif`;
            ctx.fillStyle = '#6b7280';
          }
          ctx.fillText(line, widthPx / 2, textY + i * (fontSize + 4));
        });
      } else {
        const qrY = (heightPx - qrDrawSize) / 2;
        ctx.drawImage(img, padding, qrY, qrDrawSize, qrDrawSize);
        const textX = padding + qrDrawSize + padding;
        const lines = getVisibleLines();
        const fontSize = Math.max(Math.round(heightPx * 0.09), 14);
        const lineHeight = fontSize + 6;
        const totalTextHeight = lines.length * lineHeight;
        let textY = (heightPx - totalTextHeight) / 2 + fontSize;

        ctx.textAlign = 'left';
        lines.forEach((line, i) => {
          if (i === 0) {
            ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
            ctx.fillStyle = '#111827';
          } else {
            ctx.font = `${Math.round(fontSize * 0.8)}px system-ui, sans-serif`;
            ctx.fillStyle = '#6b7280';
          }
          ctx.fillText(line, textX, textY + i * lineHeight, widthPx - textX - padding);
        });
      }

      const a = document.createElement('a');
      a.download = `label-${batch.batch_code}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svgEl = svgRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgHtml = svgEl.outerHTML;
    const lines = getVisibleLines();
    const widthMm = (labelSize.width * 25.4).toFixed(1);
    const heightMm = (labelSize.height * 25.4).toFixed(1);

    printWindow.document.write(`
      <html><head><title>Label: ${batch.batch_code}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; }
        .label {
          width: ${widthMm}mm; height: ${heightMm}mm;
          display: flex; align-items: center;
          ${labelSize.layout === 'vertical' ? 'flex-direction: column; justify-content: center;' : ''}
          padding: 2mm; gap: 2mm;
        }
        .qr svg { display: block; width: ${Math.round(labelSize.qr_size * 0.35)}mm; height: ${Math.round(labelSize.qr_size * 0.35)}mm; }
        .text { ${labelSize.layout === 'vertical' ? 'text-align: center;' : ''} }
        .text .line { display: block; }
        .text .line:first-child { font-weight: 700; font-size: 9pt; }
        .text .line:not(:first-child) { font-size: 7pt; color: #555; }
      </style></head><body>
      <div class="label">
        <div class="qr">${svgHtml}</div>
        <div class="text">${lines.map(l => `<span class="line">${l}</span>`).join('')}</div>
      </div>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    printWindow.document.close();
  }

  const previewScale = 0.7;
  const previewW = labelSize.width * 96 * previewScale;
  const previewH = labelSize.height * 96 * previewScale;
  const qrPreviewSize = Math.min(labelSize.qr_size * previewScale, previewH - 12);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <X size={18} />
        </button>

        {/* Success header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Batch Created</h2>
            <p className="text-sm text-gray-500">{batch.batch_code} -- {getBatchTypeLabel(batch.batch_type)}</p>
          </div>
        </div>

        {/* QR Label Preview */}
        <div className="flex justify-center mb-5">
          <div
            ref={svgRef}
            className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden"
            style={{ width: `${previewW}px`, height: `${previewH}px`, padding: '6px' }}
          >
            <div className={`w-full h-full flex ${labelSize.layout === 'vertical' ? 'flex-col items-center justify-center' : 'items-center gap-2'}`}>
              <div className="flex-shrink-0">
                <QRCodeSVG
                  value={qrValue}
                  size={qrPreviewSize}
                  level={labelFields.error_correction}
                  includeMargin={false}
                />
              </div>
              <div className={`min-w-0 overflow-hidden ${labelSize.layout === 'vertical' ? 'text-center mt-1' : ''}`}>
                {labelFields.show_batch_code && (
                  <p className="font-bold text-gray-900 leading-tight truncate" style={{ fontSize: '10px' }}>{batch.batch_code}</p>
                )}
                {labelFields.show_batch_type && (
                  <p className="text-gray-600 leading-tight truncate" style={{ fontSize: '8px' }}>{getBatchTypeLabel(batch.batch_type)}</p>
                )}
                {labelFields.show_species && batch.species_name && (
                  <p className="text-gray-500 leading-tight truncate" style={{ fontSize: '7px' }}>{batch.species_name}</p>
                )}
                {labelFields.show_strain && batch.strain_code && (
                  <p className="text-gray-400 font-mono leading-tight truncate" style={{ fontSize: '7px' }}>{batch.strain_code}</p>
                )}
                {labelFields.show_date && (
                  <p className="text-gray-400 leading-tight" style={{ fontSize: '6px' }}>{batch.start_date}</p>
                )}
                {labelFields.show_room && batch.room_name && (
                  <p className="text-gray-400 leading-tight truncate" style={{ fontSize: '6px' }}>{batch.room_name}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mb-4">
          Label size: {labelSize.width}" x {labelSize.height}" -- Adjust in App Settings
        </p>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <Download size={15} /> Download PNG
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <Printer size={15} /> Print Label
          </button>
        </div>
        <button
          onClick={onGoToBatch}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
        >
          Go to Batch <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
