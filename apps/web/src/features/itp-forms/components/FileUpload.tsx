'use client';

import React, { useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@siteproof/design-system';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  currentFiles?: (File | string)[];
  label?: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
}

export function FileUpload({
  onFilesSelect,
  currentFiles = [],
  label = 'Files',
  accept,
  multiple = true,
  required = false
}: FileUploadProps) {
  const [fileList, setFileList] = useState<(File | string)[]>(currentFiles);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const newFileList = multiple ? [...fileList, ...files] : files;
      setFileList(newFileList);
      onFilesSelect(newFileList.filter(f => f instanceof File) as File[]);
    }
  };

  const removeFile = (index: number) => {
    const newFileList = fileList.filter((_, i) => i !== index);
    setFileList(newFileList);
    onFilesSelect(newFileList.filter(f => f instanceof File) as File[]);
  };

  const getFileName = (file: File | string): string => {
    if (typeof file === 'string') {
      return file.split('/').pop() || 'File';
    }
    return file.name;
  };

  const getFileSize = (file: File | string): string => {
    if (typeof file === 'string') {
      return '';
    }
    const size = file.size / 1024;
    return size > 1024 
      ? `${(size / 1024).toFixed(1)} MB`
      : `${size.toFixed(1)} KB`;
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        type="button"
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
        className="w-full mb-3"
      >
        <Upload className="h-4 w-4 mr-2" />
        Choose {multiple ? 'Files' : 'File'}
      </Button>

      {fileList.length > 0 && (
        <div className="space-y-2">
          {fileList.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {getFileName(file)}
                  </p>
                  {file instanceof File && (
                    <p className="text-xs text-gray-500">{getFileSize(file)}</p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}