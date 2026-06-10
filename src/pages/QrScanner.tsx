import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../hooks/useRoute';
import { getQrEntityTypeLabel } from '../lib/utils';
import type { QrCode as QrCodeType, QrScanResult } from '../lib/types';

interface ScanState {
  status: 'idle' | 'scanning' | 'loading' | 'success' | 'error';
  qrCode?: QrCodeType;
  errorMessage?: string;
  scanResult?: QrScanResult;
}

function extractQrText(raw: string): string {
  try {
    const url = new URL(raw);
    const hash = url.hash; // e.g. #/scan?code=QR-BATCH-...
    const match = hash.match(/[?&]code=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // not a URL
  }
  return raw.trim();
}

export default function QrScanner({
  taskId,
  required,
  code: initialCode,
}: {
  taskId?: string;
  required?: string;
  code?: string;
}) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [state, setState] = useState<ScanState>({ status: 'idle' });
  const [verificationDone, setVerificationDone] = useState(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Auto-process code from URL param
  useEffect(() => {
    if (initialCode && state.status === 'idle') {
      processCode(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function startCamera() {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      scanLoop();
    } catch {
      setCameraError('Camera access denied or unavailable. Use manual entry below.');
    }
  }

  function scanLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function tick() {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas!.width = video.videoWidth;
      canvas!.height = video.videoHeight;
      ctx!.drawImage(video, 0, 0, canvas!.width, canvas!.height);
      const imageData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
      const found = jsQR(imageData.data, imageData.width, imageData.height);
      if (found?.data) {
        stopCamera();
        processCode(found.data);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  async function processCode(raw: string) {
    const qrText = extractQrText(raw);
    if (!qrText) return;

    setState({ status: 'loading' });

    const { data: qrCode } = await supabase
      .from('qr_codes')
      .select('*, creator:profiles!created_by(full_name)')
      .eq('qr_text', qrText)
      .maybeSingle();

    let scanResult: QrScanResult = 'Success';

    if (!qrCode) {
      scanResult = 'Invalid code';
    } else if (qrCode.status !== 'Active') {
      scanResult = 'Inactive code';
    }

    // Log scan
    await supabase.from('qr_scan_logs').insert({
      qr_code_id: qrCode?.id ?? null,
      scanned_code: qrText,
      entity_type: qrCode?.entity_type ?? null,
      entity_id: qrCode?.entity_id ?? null,
      scanned_by: user?.id ?? null,
      scan_context: taskId ? 'task_verification' : 'general',
      related_task_id: taskId ?? null,
      result: scanResult,
    });

    // Update last_scanned_at
    if (qrCode && scanResult === 'Success') {
      await supabase.from('qr_codes').update({ last_scanned_at: new Date().toISOString() }).eq('id', qrCode.id);
    }

    if (scanResult !== 'Success' || !qrCode) {
      setState({ status: 'error', errorMessage: scanResult, scanResult });
      return;
    }

    // Task QR verification flow
    if (taskId && required && !verificationDone) {
      await handleTaskVerification(qrCode, qrText);
      return;
    }

    setState({ status: 'success', qrCode, scanResult });
  }

  async function handleTaskVerification(qrCode: QrCodeType, qrText: string) {
    // Fetch task to check expected entity
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    let verResult: 'Matched' | 'Wrong QR' | 'Wrong location' | 'Wrong batch' | 'Expired' = 'Matched';

    if (!task) {
      verResult = 'Wrong QR';
    } else if (required === 'batch' && task.batch_id) {
      // Check that scanned QR belongs to the task's batch
      if (qrCode.entity_type !== 'batch' || qrCode.entity_id !== task.batch_id) {
        verResult = 'Wrong batch';
      }
    } else if (required === 'location') {
      if (!['location', 'rack', 'shelf'].includes(qrCode.entity_type)) {
        verResult = 'Wrong location';
      }
    } else if (required === 'checkpoint') {
      if (qrCode.entity_type !== 'checkpoint') {
        verResult = 'Wrong QR';
      }
    } else if (required === 'crate') {
      if (qrCode.entity_type !== 'harvest_crate') {
        verResult = 'Wrong QR';
      }
    }

    await supabase.from('task_qr_verifications').insert({
      task_id: taskId,
      qr_code_id: qrCode.id,
      verification_type: required as any,
      verified_by: user?.id ?? null,
      expected_entity_type: required === 'batch' ? 'batch' : required,
      expected_entity_id: task?.batch_id ?? null,
      actual_entity_type: qrCode.entity_type,
      actual_entity_id: qrCode.entity_id,
      result: verResult,
      is_manager_override: false,
    });

    setVerificationDone(true);

    if (verResult === 'Matched') {
      // Navigate back to task with verified param
      navigate(`/tasks/${taskId}`, { verified: required! });
    } else {
      setState({ status: 'error', errorMessage: verResult, scanResult: 'Wrong entity' as any });
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processCode(manualInput.trim());
    setManualInput('');
  }

  function reset() {
    setState({ status: 'idle' });
    setVerificationDone(false);
    setManualInput('');
  }

  const isVerifyMode = !!(taskId && required);

  return (
    <div className="p-4 lg:p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => taskId ? navigate(`/tasks/${taskId}`) : navigate('/dashboard')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isVerifyMode ? 'Scan for Verification' : 'QR Scanner'}
          </h1>
          {isVerifyMode && (
            <p className="text-sm text-gray-500 mt-0.5">
              Scan the <span className="font-medium capitalize">{required}</span> QR code for this task
            </p>
          )}
        </div>
      </div>

      {/* Result states */}
      {state.status === 'loading' && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Loader2 size={36} className="text-emerald-500 animate-spin" />
          <p className="text-sm text-gray-500">Looking up code...</p>
        </div>
      )}

      {state.status === 'success' && state.qrCode && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Code Found</p>
              <p className="text-xs text-gray-400">{getQrEntityTypeLabel(state.qrCode.entity_type)}</p>
            </div>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${state.qrCode.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {state.qrCode.status}
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Label</p>
              <p className="text-sm font-semibold text-gray-900">{state.qrCode.label}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Code</p>
              <p className="text-sm font-mono text-gray-700">{state.qrCode.qr_text}</p>
            </div>
            {state.qrCode.description && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Description</p>
                <p className="text-sm text-gray-600">{state.qrCode.description}</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Scan Another
            </button>
            {state.qrCode.entity_type === 'batch' && state.qrCode.entity_id && (
              <button
                onClick={() => navigate(`/batches/${state.qrCode!.entity_id}`)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                View Batch
              </button>
            )}
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Scan Failed</p>
              <p className="text-sm text-red-600">{state.errorMessage}</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {(state.status === 'idle' || state.status === 'scanning') && (
        <>
          {/* Camera section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
            <div className="relative bg-gray-900 aspect-square">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <QrCode size={32} className="text-white/60" />
                  </div>
                  <p className="text-white/60 text-sm">Camera not active</p>
                </div>
              )}

              {cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/70 rounded-xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 flex items-center justify-between">
              {cameraError ? (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle size={14} />
                  <p className="text-xs">{cameraError}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  {cameraActive ? 'Point camera at QR code' : 'Tap to activate camera'}
                </p>
              )}
              <button
                onClick={cameraActive ? stopCamera : startCamera}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  cameraActive
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {cameraActive ? <CameraOff size={13} /> : <Camera size={13} />}
                {cameraActive ? 'Stop' : 'Start Camera'}
              </button>
            </div>
          </div>

          {/* Manual entry */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Manual Entry</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="Enter QR code text (e.g. QR-BATCH-FB-0001)"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus={!!initialCode}
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg transition-colors"
              >
                Lookup
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
