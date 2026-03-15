'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image-compression';
import { X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

const MAX_UPLOAD_MB = 5;
const MAX_INPUT_MB = 15; // Larger files are compressed before upload

interface FabricPhotoUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  userId: string;
}

const BUCKET = 'fabric-photos';

export function FabricPhotoUpload({ value, onChange, userId }: FabricPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [status, setStatus] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    setStatus('Compressing...');
    let fileToUpload = file;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      try {
        fileToUpload = await compressImage(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: false,
        });
      } catch (err) {
        console.error('Compression error:', err);
        setStatus(null);
        setUploading(false);
        alert('Failed to compress image. Try a smaller file.');
        return;
      }
    }
    setStatus('Uploading...');

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(fileToUpload);

    try {
      const supabase = createClient();
      const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
      const fileName = `fabric/${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, fileToUpload, { cacheControl: '3600', upsert: false });

      if (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image. Please try again.');
        setPreview(null);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
      onChange(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload image. Please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
      setStatus(null);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <Label>Photo</Label>
      {preview ? (
        <div className="relative w-full max-w-[200px] aspect-square border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute inset-0 w-full h-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-lg"
            aria-label="View photo larger"
          >
            <Image src={preview} alt="Fabric" fill className="object-cover" />
          </button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 z-10"
            onClick={e => {
              e.stopPropagation();
              handleRemove();
            }}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
          <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
            <DialogContent className="max-w-4xl w-[95vw] p-2 border-none bg-black/90 [&>button:not(.lightbox-close)]:hidden">
              <DialogTitle className="sr-only">View fabric photo</DialogTitle>
              <DialogClose
                className="lightbox-close absolute right-2 top-2 z-10 rounded-sm p-1.5 text-white opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </DialogClose>
              <div className="relative w-full flex items-center justify-center min-h-[50vh]">
                <Image
                  src={preview}
                  alt="Fabric"
                  width={1200}
                  height={1200}
                  className="max-h-[85vh] w-auto object-contain"
                  unoptimized
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors max-w-[200px]"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {uploading ? (status || 'Uploading...') : 'Click to upload (max 15MB, compressed if needed)'}
          </p>
        </div>
      )}
    </div>
  );
}
