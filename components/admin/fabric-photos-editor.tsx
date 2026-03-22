'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { prepareFabricPhotoForUpload } from '@/lib/fabric-photo-compression';
import { uploadFabricImageToStorage } from '@/lib/fabric-photo-storage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ChevronDown, ChevronUp, Image as ImageIcon, X } from 'lucide-react';
import Image from 'next/image';

const MAX_INPUT_MB = 15;

interface FabricPhotosEditorProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  userId: string;
  onUploadingChange?: (uploading: boolean) => void;
}

export function FabricPhotosEditor({ urls, onChange, userId, onUploadingChange }: FabricPhotosEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const maxInputBytes = MAX_INPUT_MB * 1024 * 1024;
    if (file.size > maxInputBytes) {
      alert(`Image must be under ${MAX_INPUT_MB}MB.`);
      return;
    }

    setUploading(true);
    setStatus('Optimizing...');
    let fileToUpload: File;
    try {
      fileToUpload = await prepareFabricPhotoForUpload(file);
    } catch (err) {
      console.error('Compression error:', err);
      setStatus(null);
      setUploading(false);
      alert('Failed to process image. Try a smaller file.');
      return;
    }
    setStatus('Uploading...');

    try {
      const result = await uploadFabricImageToStorage(fileToUpload, userId);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      onChange([...urls, result.publicUrl]);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const removeAt = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= urls.length) return;
    const next = [...urls];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>Photos</Label>
      <p className="text-xs text-muted-foreground">
        First photo is used on the storefront grid. Add more for the detail carousel.
      </p>
      <div className="flex flex-wrap gap-3">
        {urls.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative w-[120px] sm:w-[140px] aspect-square border rounded-lg overflow-hidden shrink-0"
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(url)}
              className="absolute inset-0 w-full h-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-lg"
              aria-label={`View photo ${index + 1} larger`}
            >
              <Image src={url} alt="" fill className="object-cover" sizes="140px" />
            </button>
            <div className="absolute top-1 right-1 z-10 flex flex-col gap-0.5">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                disabled={index === 0 || uploading}
                onClick={e => {
                  e.stopPropagation();
                  move(index, -1);
                }}
                aria-label="Move earlier"
              >
                <ChevronUp className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                disabled={index === urls.length - 1 || uploading}
                onClick={e => {
                  e.stopPropagation();
                  move(index, 1);
                }}
                aria-label="Move later"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute bottom-1 right-1 z-10 h-7 px-2"
              onClick={e => {
                e.stopPropagation();
                removeAt(index);
              }}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
            {index === 0 ? (
              <span className="absolute bottom-1 left-1.5 bg-background/90 text-[10px] font-medium px-1 rounded">
                Grid
              </span>
            ) : null}
          </div>
        ))}
        <div
          className="relative w-[120px] sm:w-[140px] aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors shrink-0"
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {uploading && (
            <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center rounded-lg">
              <LoadingSpinner size="sm" text={status || 'Uploading...'} />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <ImageIcon className="h-8 w-8 text-muted-foreground mb-1" />
          <span className="text-xs text-muted-foreground">
            {uploading ? (status || 'Uploading...') : 'Add photo'}
          </span>
        </div>
      </div>

      <Dialog open={!!lightboxUrl} onOpenChange={open => !open && setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-2 border-none bg-black/90 [&>button:not(.lightbox-close)]:hidden">
          <DialogTitle className="sr-only">View fabric photo</DialogTitle>
          <DialogClose
            className="lightbox-close absolute right-2 top-2 z-10 rounded-sm p-1.5 text-white opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </DialogClose>
          {lightboxUrl && (
            <div className="relative w-full flex items-center justify-center min-h-[50vh]">
              <Image
                src={lightboxUrl}
                alt="Fabric"
                width={1200}
                height={1200}
                className="max-h-[85vh] w-auto object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
