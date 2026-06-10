import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navigate } from '../hooks/useRoute';
import { buildQrUrl, getQrEntityTypeLabel, formatDate } from '../lib/utils';
import { PageLoader } from '../components/LoadingSpinner';
import type { QrCode } from '../lib/types';

const SIZES = [
  { label: 'Small (50×30mm)', key: 'sm', qr: 100, px: 'w-48' },
  { label: 'Medium (70×40mm)', key: 'md', qr: 140, px: 'w-64' },
  { label: 'Large (100×60mm)', key: 'lg', qr: 200, px: 'w-96' },
];

export default function QrPrint({ qrId }: { qrId: string }) {
  const [qrCode, setQrCode] = useState<QrCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');

  useEffect(() => {
    supabase.from('qr_codes').select('*').eq('id', qrId).single().then(({ data }) => {
      setQrCode(data as QrCode);
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

  const sizeConfig = SIZES.find(s => s.key === size) ?? SIZES[1];
  const qrUrl = buildQrUrl(qrCode.qr_text);

  return (
    <div className="p-4 lg:p-6">
      {/* Screen controls — hidden on print */}
      <div className="print:hidden mb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/qr')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Print QR Label</h1>
        </div>

        <div className="flex gap-2 mb-4">
          {SIZES.map(s => (
            <button key={s.key} onClick={() => setSize(s.key as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${size === s.key ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
        >
          <Printer size={16} /> Print Label
        </button>
      </div>

      {/* Print-optimized label */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-label, #qr-label * { visibility: visible; }
          #qr-label { position: fixed; top: 0; left: 0; }
          @page { margin: 4mm; size: ${size === 'sm' ? '50mm 30mm' : size === 'md' ? '70mm 40mm' : '100mm 60mm'}; }
        }
      `}</style>

      <div
        id="qr-label"
        className={`${sizeConfig.px} bg-white border-2 border-gray-300 rounded-xl p-3 flex items-center gap-3`}
      >
        <div className="flex-shrink-0">
          <QRCodeSVG value={qrUrl} size={sizeConfig.qr} level="M" includeMargin={false}
            imageSettings={{ src: '', height: 0, width: 0, excavate: false }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 leading-tight" style={{ fontSize: size === 'sm' ? '9px' : size === 'md' ? '11px' : '13px' }}>
            {qrCode.label}
          </p>
          <p className="text-gray-500 font-mono leading-snug mt-0.5" style={{ fontSize: size === 'sm' ? '7px' : size === 'md' ? '8px' : '10px' }}>
            {qrCode.qr_text}
          </p>
          <p className="text-gray-400 mt-0.5" style={{ fontSize: size === 'sm' ? '7px' : size === 'md' ? '8px' : '9px' }}>
            {getQrEntityTypeLabel(qrCode.entity_type)}
          </p>
          <p className="text-gray-400" style={{ fontSize: size === 'sm' ? '6px' : '8px' }}>
            {formatDate(qrCode.created_at)}
          </p>
        </div>
      </div>

      {/* Preview helper */}
      <div className="print:hidden mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
        <p>Tip: Click Print and select your label printer. Set paper size to match the selected label size.</p>
        <p className="mt-1 font-mono text-gray-400">{qrCode.qr_text}</p>
      </div>
    </div>
  );
}
