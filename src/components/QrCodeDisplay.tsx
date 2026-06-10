import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, CheckCircle2, QrCode, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { buildQrUrl, getQrStatusColor, getQrEntityTypeLabel } from '../lib/utils';
import { StatusBadge } from './StatusBadge';
import type { QrCode as QrCodeType } from '../lib/types';

interface Props {
  qrCode: QrCodeType;
  size?: number;
  showActions?: boolean;
  onUpdated?: () => void;
}

export function QrCodeDisplay({ qrCode, size = 160, showActions = true, onUpdated }: Props) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const [marked, setMarked] = useState(!!qrCode.printed_at);

  const qrUrl = buildQrUrl(qrCode.qr_text);

  async function markPrinted() {
    await supabase.from('qr_codes').update({ printed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', qrCode.id);
    setMarked(true);
    onUpdated?.();
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const svgEl = svgRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgHtml = svgEl.outerHTML;
    printWindow.document.write(`
      <html><head><title>QR: ${qrCode.qr_text}</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; }
        .label { font-size: 12px; font-weight: 600; margin-top: 8px; word-break: break-all; }
        .sub { font-size: 10px; color: #555; margin-top: 2px; }
        svg { display: block; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${svgHtml}
      <div class="label">${qrCode.label}</div>
      <div class="sub">${getQrEntityTypeLabel(qrCode.entity_type)} · ${qrCode.qr_text}</div>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    printWindow.document.close();
    setPrinting(false);
    markPrinted();
  }

  function handleDownload() {
    const canvas = document.createElement('canvas');
    canvas.width = size + 40;
    canvas.height = size + 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const svgEl = svgRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 20, 10, size, size);
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(qrCode.label.slice(0, 30), canvas.width / 2, size + 28);
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px system-ui';
      ctx.fillText(qrCode.qr_text, canvas.width / 2, size + 44);
      const a = document.createElement('a');
      a.download = `${qrCode.qr_text}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    markPrinted();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={svgRef} className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
        <QRCodeSVG
          value={qrUrl}
          size={size}
          level="M"
          includeMargin={false}
          imageSettings={{
            src: '',
            height: 0,
            width: 0,
            excavate: false,
          }}
        />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">{qrCode.label}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{qrCode.qr_text}</p>
        <div className="flex items-center gap-1.5 justify-center mt-1.5">
          <span className="text-xs text-gray-500">{getQrEntityTypeLabel(qrCode.entity_type)}</span>
          <span className="text-gray-300">·</span>
          <StatusBadge label={qrCode.status} color={getQrStatusColor(qrCode.status)} />
          {marked && <CheckCircle2 size={13} className="text-emerald-500" />}
        </div>
      </div>

      {showActions && qrCode.status === 'Active' && (
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Printer size={13} /> Print
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Download size={13} /> PNG
          </button>
          {!marked && (
            <button
              onClick={markPrinted}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              <CheckCircle2 size={13} /> Printed
            </button>
          )}
        </div>
      )}
    </div>
  );
}
