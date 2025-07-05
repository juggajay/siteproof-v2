'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, X, RotateCw } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { motion, AnimatePresence } from 'framer-motion';

interface PhotoCaptureProps {
  label: string;
  required?: boolean;
  value?: { photoId: string; type: 'photo' };
  onChange: (blob: Blob) => void;
  onDelete?: () => void;
}

export function PhotoCapture({ label, required = false, onChange, onDelete }: PhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setStream(mediaStream);
      setIsCapturing(true);
    } catch (error) {
      console.error('Failed to access camera:', error);
      // Fallback to file input
      fileInputRef.current?.click();
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onChange(blob);
          setPreviewUrl(URL.createObjectURL(blob));
          stopCamera();
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      onChange(file);
    }
  };

  const handleDelete = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onDelete?.();
  };

  const handleRetake = () => {
    handleDelete();
    startCamera();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <AnimatePresence mode="wait">
        {!previewUrl && !isCapturing ? (
          // Initial state - show capture button
          <motion.div
            key="initial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
          >
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-3">Take a photo or upload from device</p>
            <div className="flex gap-3 justify-center">
              <Button type="button" variant="secondary" onClick={startCamera}>
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </motion.div>
        ) : isCapturing ? (
          // Camera capture mode
          <motion.div
            key="capture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative rounded-lg overflow-hidden bg-black"
          >
            <video ref={videoRef} autoPlay playsInline muted className="w-full" />
            <canvas ref={canvasRef} className="hidden" />

            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-3 rounded-full bg-white/20 backdrop-blur text-white hover:bg-white/30 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="p-4 rounded-full bg-white text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <Camera className="w-8 h-8" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : previewUrl ? (
          // Preview mode
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative rounded-lg overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Captured photo" className="w-full rounded-lg" />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="p-2 rounded-lg bg-white shadow-lg hover:shadow-xl transition-shadow"
                title="Retake photo"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 rounded-lg bg-white shadow-lg hover:shadow-xl transition-shadow"
                title="Delete photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
