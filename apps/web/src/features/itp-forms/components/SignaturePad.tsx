'use client';

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@siteproof/design-system';
import { RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onCancel?: () => void;
  initialSignature?: string;
}

export function SignaturePad({ onSave, onCancel, initialSignature }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);

  const clear = () => {
    sigCanvas.current?.clear();
    setHasSignature(false);
  };

  const save = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL();
      onSave(dataUrl);
    }
  };

  const handleBegin = () => {
    setHasSignature(true);
  };

  React.useEffect(() => {
    if (initialSignature && sigCanvas.current) {
      sigCanvas.current.fromDataURL(initialSignature);
      setHasSignature(true);
    }
  }, [initialSignature]);

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="mb-2 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Signature</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={!hasSignature}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
      
      <div className="border border-gray-300 rounded bg-gray-50 mb-3">
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: 'signature-canvas w-full h-40',
            style: { width: '100%', height: '160px' }
          }}
          onBegin={handleBegin}
        />
      </div>
      
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={save}
          disabled={!hasSignature}
          className="flex-1"
        >
          Save Signature
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}