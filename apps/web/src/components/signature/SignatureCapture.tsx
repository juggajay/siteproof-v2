'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, X, Check, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { toast } from 'sonner';

interface SignatureCaptureProps {
  onSave: (signatureData: string) => void;
  onCancel?: () => void;
  initialSignature?: string;
  signatory?: {
    name: string;
    title?: string;
    company?: string;
  };
}

export function SignatureCapture({
  onSave,
  onCancel,
  initialSignature,
  signatory,
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [_lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Initialize canvas
    initializeCanvas();

    // Load initial signature if provided
    if (initialSignature) {
      loadSignature(initialSignature);
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [initialSignature]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale for high DPI displays
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Add signature line
    drawSignatureLine();
  };

  const drawSignatureLine = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const y = rect.height * 0.75;

    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(rect.width - 20, y);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Reset stroke style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
  };

  const loadSignature = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSignatureLine();
      ctx.drawImage(img, 0, 0);
      setHasSignature(true);
    };
    img.src = dataUrl;
  };

  const getPosition = (event: MouseEvent | TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    setIsDrawing(true);

    const pos = getPosition(event.nativeEvent as any);
    setLastPosition(pos);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPosition(event.nativeEvent as any);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setLastPosition(pos);
    setHasSignature(true);
  };

  const stopDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSignatureLine();
    setHasSignature(false);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasSignature) {
      toast.error('Please provide a signature');
      return;
    }

    // Get signature as data URL
    const signatureData = canvas.toDataURL('image/png');

    // Create signature object with metadata
    const signatureObject = {
      data: signatureData,
      timestamp: new Date().toISOString(),
      signatory: signatory || null,
      deviceType: isMobile ? 'mobile' : 'desktop',
    };

    // Call save handler
    onSave(JSON.stringify(signatureObject));

    toast.success('Signature saved successfully');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Digital Signature</h3>
            {signatory && (
              <div className="mt-1 text-sm text-gray-600">
                <p>{signatory.name}</p>
                {signatory.title && <p>{signatory.title}</p>}
                {signatory.company && <p>{signatory.company}</p>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isMobile ? (
              <>
                <Smartphone className="w-4 h-4" />
                <span>Touch to sign</span>
              </>
            ) : (
              <>
                <Monitor className="w-4 h-4" />
                <span>Click and drag to sign</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="p-4">
        <div className="relative bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <canvas
            ref={canvasRef}
            className="w-full h-48 sm:h-64 cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{ touchAction: 'none' }}
          />

          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <PenTool className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  {isMobile ? 'Touch here to sign' : 'Sign here'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Signature line label */}
        <div className="mt-2 text-xs text-gray-500 text-center">Sign above the line</div>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2 justify-between">
          <Button variant="ghost" onClick={clearSignature} disabled={!hasSignature}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear
          </Button>

          <div className="flex gap-2">
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}

            <Button onClick={saveSignature} disabled={!hasSignature}>
              <Check className="w-4 h-4 mr-2" />
              Save Signature
            </Button>
          </div>
        </div>
      </div>

      {/* Legal Notice */}
      <div className="px-4 pb-4">
        <p className="text-xs text-gray-500 text-center">
          By signing above, you agree that your electronic signature is the legal equivalent of your
          manual signature on this document.
        </p>
      </div>
    </div>
  );
}
