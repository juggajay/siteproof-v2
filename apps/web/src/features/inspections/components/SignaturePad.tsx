'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Check } from 'lucide-react';
import { Button } from '@siteproof/design-system';

interface SignaturePadProps {
  label: string;
  required?: boolean;
  value?: string;
  onChange: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

export function SignaturePad({
  label,
  required = false,
  value,
  onChange,
  width = 400,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set up canvas
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Configure drawing style
    context.strokeStyle = '#1a1a1a';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Load existing signature if provided
    if (value) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
        setIsEmpty(false);
      };
      img.src = value;
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    if (!context) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    if (!context) return;

    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    // Save signature
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange('');
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="space-y-3">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full border-2 border-gray-300 rounded-lg bg-white cursor-crosshair touch-none"
            style={{ height: `${height}px` }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400">Sign here</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={clearSignature}
            disabled={isEmpty}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Clear
          </Button>
          
          {!isEmpty && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 text-sm text-green-600"
            >
              <Check className="w-4 h-4" />
              Signature captured
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}