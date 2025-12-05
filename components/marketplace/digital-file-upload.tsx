'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, File, Loader2, Download, Info } from 'lucide-react';
import Link from 'next/link';

interface FileItem {
  id: string;
  url: string;
  fileName: string;
  fileSize?: number;
  file?: File;
  uploading?: boolean;
}

interface DigitalFileUploadProps {
  value?: string[]; // Array of file paths in storage
  onChange: (paths: string[]) => void;
  userId: string;
  maxFiles?: number;
  maxFileSizeMB?: number;
}

export function DigitalFileUpload({
  value = [],
  onChange,
  userId,
  maxFiles = 10,
  maxFileSizeMB = 100,
}: DigitalFileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>(
    value.map((path, index) => ({
      id: `existing-${index}`,
      url: path,
      fileName: path.split('/').pop() || `File ${index + 1}`,
    }))
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFiles = (newFiles: FileItem[]) => {
    setFiles(newFiles);
    // Return storage paths (not public URLs since bucket is private)
    onChange(newFiles.map(f => f.url).filter(Boolean));
  };

  // Sync files state with parent onChange callback
  React.useEffect(() => {
    onChange(files.map(f => f.url).filter(Boolean));
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconClass = 'h-5 w-5 text-muted-foreground';

    if (['pdf'].includes(ext || '')) {
      return <File className={`${iconClass} text-red-500`} />;
    }
    if (['zip', 'rar', '7z'].includes(ext || '')) {
      return <File className={`${iconClass} text-yellow-500`} />;
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return <File className={`${iconClass} text-blue-500`} />;
    }
    return <File className={iconClass} />;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Check if adding these files would exceed max
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files.`);
      return;
    }

    // Validate all files - only PDFs allowed
    for (const file of selectedFiles) {
      // Check file type - must be PDF
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPDF) {
        alert(`${file.name} is not a PDF file. Only PDF files are allowed.`);
        return;
      }

      const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert(`${file.name} is too large. Maximum file size is ${maxFileSizeMB}MB.`);
        return;
      }
    }

    // Create preview items
    const newItems: FileItem[] = selectedFiles.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      url: '',
      fileName: file.name,
      fileSize: file.size,
      file,
      uploading: true,
    }));

    // Add new items to state
    setFiles(prevFiles => [...prevFiles, ...newItems]);

    // Upload each file
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      if (!item.file) continue;

      try {
        console.log(`Uploading file ${i + 1}/${newItems.length}: ${item.fileName}`);

        const storagePath = await uploadFile(item.file, item.id);

        if (!storagePath) {
          throw new Error('Upload failed: No path returned');
        }

        // Update item with final path
        setFiles(prevFiles => {
          const finalIndex = prevFiles.findIndex(f => f.id === item.id);
          if (finalIndex === -1) {
            console.warn('Item not found after upload:', item.id);
            return prevFiles;
          }

          const updated = [...prevFiles];
          updated[finalIndex] = {
            ...updated[finalIndex],
            url: storagePath,
            uploading: false,
            file: undefined,
          };
          return updated;
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        // Remove failed item and show error
        setFiles(prevFiles => {
          return prevFiles.filter(f => f.id !== item.id);
        });
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to upload ${item.fileName}: ${errorMsg}`);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File, itemId: string): Promise<string | null> => {
    try {
      const supabase = createClient();

      // Generate unique filename preserving original extension
      const fileExt = file.name.split('.').pop() || 'file';
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100); // Limit filename length
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedFileName}`;

      console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);

      // Upload file to product-files bucket (private)
      const { data, error } = await supabase.storage.from('product-files').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('Upload error:', error);
        // Check if it's a duplicate file error
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          // Try with a different filename
          const retryFileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}-retry-${sanitizedFileName}`;
          console.log('Retrying upload with filename:', retryFileName);
          const { data: retryData, error: retryError } = await supabase.storage
            .from('product-files')
            .upload(retryFileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (retryError) {
            throw retryError;
          }

          return retryData.path;
        }
        throw error;
      }

      if (!data) {
        throw new Error('Upload succeeded but no data returned');
      }

      console.log('Upload successful, path:', data.path);
      return data.path; // Return storage path, not public URL (bucket is private)
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleRemove = async (id: string, storagePath: string) => {
    // If it's an existing file (has storage path), delete it from storage
    if (storagePath && !storagePath.startsWith('blob:')) {
      try {
        const supabase = createClient();
        const { error } = await supabase.storage.from('product-files').remove([storagePath]);

        if (error) {
          console.error('Error deleting file from storage:', error);
          // Continue to remove from UI anyway
        }
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }

    setFiles(prevFiles => prevFiles.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>
            Digital Files ({files.length}/{maxFiles}) <span className="text-red-500">*</span>
          </Label>
          <Link
            href="/marketplace/watermarking-info"
            target="_blank"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Learn about file delivery and watermarking"
          >
            <Info className="h-4 w-4" />
          </Link>
        </div>
        {files.length < maxFiles && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Add Files
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || files.length >= maxFiles}
      />

      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(item.fileName)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.fileName}</p>
                  {item.fileSize && (
                    <p className="text-xs text-muted-foreground">{formatFileSize(item.fileSize)}</p>
                  )}
                </div>
                {item.uploading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(item.id, item.url)}
                disabled={item.uploading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Click to upload PDF files or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            PDF files only, up to {maxFileSizeMB}MB each
          </p>
          <p className="text-xs text-red-500 font-medium mt-1">At least one PDF file is required</p>
          <p className="text-xs text-muted-foreground mt-1">
            These files will be available for download after purchase
          </p>
        </div>
      )}

      {files.length > 0 && files.length < maxFiles && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Add More Files
        </Button>
      )}
    </div>
  );
}
