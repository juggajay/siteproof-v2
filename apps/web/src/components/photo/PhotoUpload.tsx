'use client';

import React, { useState, useRef } from 'react';
import NextImage from 'next/image';
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { toast } from 'sonner';

interface PhotoUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  maxSizeInMB?: number;
  acceptedFormats?: string[];
  existingPhotos?: string[];
  compress?: boolean;
  projectId?: string;
  itemId?: string;
  itemType?: 'itp' | 'ncr' | 'inspection';
}

export function PhotoUpload({
  onUpload,
  maxFiles = 5,
  maxSizeInMB = 10,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  existingPhotos = [],
  compress = true,
  projectId: _projectId,
  itemId: _itemId,
  itemType: _itemType = 'itp',
}: PhotoUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Compress image to reduce file size
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate new dimensions (max 1920px width/height)
          const maxDimension = 1920;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.85 // 85% quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    await processFiles(selectedFiles);
  };

  // Process selected files
  const processFiles = async (selectedFiles: File[]) => {
    // Validate file count
    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate and process each file
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of selectedFiles) {
      // Check format
      if (!acceptedFormats.includes(file.type)) {
        toast.error(`${file.name}: Invalid format. Accepted: ${acceptedFormats.join(', ')}`);
        continue;
      }

      // Check size
      if (file.size > maxSizeInMB * 1024 * 1024) {
        toast.error(`${file.name}: File size exceeds ${maxSizeInMB}MB`);
        continue;
      }

      // Compress if needed
      let processedFile = file;
      if (compress && file.type.startsWith('image/')) {
        try {
          processedFile = await compressImage(file);
        } catch (error) {
          console.error('Compression failed:', error);
          // Use original if compression fails
        }
      }

      validFiles.push(processedFile);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(processedFile);
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  // Start camera for direct capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      toast.error('Unable to access camera');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      setIsCameraActive(false);
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const file = new File([blob], `photo_${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              await processFiles([file]);
              stopCamera();
            }
          },
          'image/jpeg',
          0.9
        );
      }
    }
  };

  // Remove a file
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload files
  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('No files selected');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(files);
      toast.success(`${files.length} photo(s) uploaded successfully`);
      setFiles([]);
      setPreviews([]);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    await processFiles(droppedFiles);
  };

  return (
    <div className="space-y-4">
      {/* Camera View */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex justify-center gap-4">
              <Button
                onClick={capturePhoto}
                variant="primary"
                className="rounded-full w-16 h-16 p-0"
              >
                <Camera className="w-8 h-8" />
              </Button>
              <Button onClick={stopCamera} variant="secondary" className="rounded-full">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />

        <p className="text-gray-600 mb-4">Drag & drop photos here or</p>

        <div className="flex gap-2 justify-center flex-wrap">
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose Files
          </Button>

          {/* Camera button for mobile */}
          {typeof navigator !== 'undefined' && navigator.mediaDevices && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
                className="sm:hidden"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={startCamera}
                disabled={isUploading}
                className="hidden sm:inline-flex"
              >
                <Camera className="w-4 h-4 mr-2" />
                Use Camera
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Max {maxFiles} files, {maxSizeInMB}MB each
        </p>
      </div>

      {/* Existing Photos */}
      {existingPhotos.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Existing Photos</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {existingPhotos.map((photo, index) => (
              <div key={index} className="relative aspect-square">
                <NextImage
                  src={photo}
                  alt={`Existing ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, 25vw"
                  className="object-cover rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {previews.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">New Photos to Upload</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square">
                <NextImage
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, 25vw"
                  className="object-cover rounded-lg"
                  unoptimized
                />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <Button onClick={handleUpload} disabled={isUploading} className="w-full">
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload {files.length} Photo{files.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
