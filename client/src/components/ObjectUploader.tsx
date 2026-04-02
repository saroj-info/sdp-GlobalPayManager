import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Note: This is a simplified version as Uppy dependencies are not yet configured.
 * In a full implementation, this would use @uppy/core and @uppy/dashboard.
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > maxFileSize) {
      alert(`File size must be less than ${maxFileSize / 1024 / 1024}MB`);
      return;
    }

    setIsUploading(true);
    try {
      const { url } = await onGetUploadParameters();
      
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (response.ok) {
        onComplete?.({
          successful: [{ uploadURL: url }],
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <label>
        <Button className={buttonClassName} disabled={isUploading}>
          {isUploading ? 'Uploading...' : children}
        </Button>
        <input
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
          accept="*/*"
        />
      </label>
    </div>
  );
}