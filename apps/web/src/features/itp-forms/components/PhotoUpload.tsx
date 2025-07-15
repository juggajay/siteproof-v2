'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import Image from 'next/image';

interface PhotoUploadProps {
  onPhotoSelect: (file: File | string) => void;
  onRemove?: () => void;
  currentPhoto?: string | File;
  label?: string;
  required?: boolean;
}

export function PhotoUpload({ 
  onPhotoSelect, 
  onRemove, 
  currentPhoto, 
  label = 'Photo',
  required = false 
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentPhoto) {
      if (typeof currentPhoto === 'string') {
        setPreviewUrl(currentPhoto);
      } else {
        const url = URL.createObjectURL(currentPhoto);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    } else {
      setPreviewUrl(null);
    }
    return undefined;
  }, [currentPhoto]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onPhotoSelect(file);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative">
          <div className="relative h-48 w-full rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleRemove}
            className="absolute top-2 right-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCameraCapture}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleFileUpload}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      )}
    </div>
  );
}