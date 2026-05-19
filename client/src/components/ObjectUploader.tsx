import { useRef, useState } from "react";
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
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > maxFileSize) {
      alert(`File size must be less than ${maxFileSize / 1024 / 1024}MB`);
      // Reset the input so re-picking the same file fires onChange again.
      event.target.value = '';
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
      // Always clear the input so the same file can be picked again later.
      event.target.value = '';
    }
  };

  return (
    <>
      {/* Real <button>, not wrapped in a <label>. Clicking forwards to the
          hidden <input> via ref. type="button" so the Button never accidentally
          submits the surrounding form (e.g. the Upload Payslip dialog uses
          react-hook-form and would otherwise submit on click). */}
      <Button
        type="button"
        className={buttonClassName}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? 'Uploading...' : children}
      </Button>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept="*/*"
      />
    </>
  );
}