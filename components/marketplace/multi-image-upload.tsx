'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { compressImage, validateImageFile } from '@/lib/image-compression';

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  uploading?: boolean;
  compressing?: boolean;
}

interface MultiImageUploadProps {
  value?: string[]; // Array of image URLs
  onChange: (urls: string[]) => void;
  userId: string;
  maxImages?: number;
}

export function MultiImageUpload({
  value = [],
  onChange,
  userId,
  maxImages = 10,
}: MultiImageUploadProps) {
  const [images, setImages] = useState<ImageItem[]>(
    value.map((url, index) => ({ id: `existing-${index}`, url }))
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateImages = (newImages: ImageItem[]) => {
    setImages(newImages);
    onChange(newImages.map((img) => img.url).filter(Boolean));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if adding these files would exceed max
    if (images.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images.`);
      return;
    }

    // Validate all files
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }
    }

    // Create preview items
    const newItems: ImageItem[] = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      url: '',
      file,
      compressing: true,
    }));

    const updatedImages = [...images, ...newItems];
    updateImages(updatedImages);

    // Process each file: compress then upload
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      if (!item.file) continue;

      try {
        // Compress image
        const compressedFile = await compressImage(item.file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
        });

        // Update item to show it's done compressing, now uploading
        const itemIndex = updatedImages.findIndex((img) => img.id === item.id);
        if (itemIndex !== -1) {
          updatedImages[itemIndex] = {
            ...updatedImages[itemIndex],
            compressing: false,
            uploading: true,
            file: compressedFile,
          };
          updateImages([...updatedImages]);
        }

        // Upload to Supabase
        const url = await uploadImage(compressedFile, item.id, updatedImages);
        if (url) {
          const finalIndex = updatedImages.findIndex((img) => img.id === item.id);
          if (finalIndex !== -1) {
            updatedImages[finalIndex] = {
              ...updatedImages[finalIndex],
              url,
              uploading: false,
              compressing: false,
              file: undefined,
            };
            updateImages([...updatedImages]);
          }
        }
      } catch (error) {
        console.error('Error processing image:', error);
        // Remove failed item
        const failedIndex = updatedImages.findIndex((img) => img.id === item.id);
        if (failedIndex !== -1) {
          updatedImages.splice(failedIndex, 1);
          updateImages([...updatedImages]);
        }
        alert(`Failed to upload ${item.file.name}. Please try again.`);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (
    file: File,
    itemId: string,
    currentImages: ImageItem[]
  ): Promise<string | null> => {
    try {
      const supabase = createClient();

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleRemove = (id: string) => {
    const updatedImages = images.filter((img) => img.id !== id);
    updateImages(updatedImages);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...images];
    const [moved] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, moved);
    updateImages(updatedImages);
  };

  const [objectUrls, setObjectUrls] = useState<Map<string, string>>(new Map());

  const getPreviewUrl = (item: ImageItem): string => {
    if (item.url) return item.url;
    if (item.file) {
      // Check if we already have an object URL for this item
      if (!objectUrls.has(item.id)) {
        const url = URL.createObjectURL(item.file);
        setObjectUrls((prev) => new Map(prev).set(item.id, url));
        return url;
      }
      return objectUrls.get(item.id) || '';
    }
    return '';
  };

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Cleanup object URLs for removed images
  React.useEffect(() => {
    const currentIds = new Set(images.map((img) => img.id));
    const urlsToCleanup: string[] = [];
    
    objectUrls.forEach((url, id) => {
      if (!currentIds.has(id)) {
        urlsToCleanup.push(id);
        URL.revokeObjectURL(url);
      }
    });

    if (urlsToCleanup.length > 0) {
      setObjectUrls((prev) => {
        const newMap = new Map(prev);
        urlsToCleanup.forEach((id) => newMap.delete(id));
        return newMap;
      });
    }
  }, [images]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Product Images ({images.length}/{maxImages})</Label>
        {images.length < maxImages && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Add Images
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || images.length >= maxImages}
      />

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((item, index) => {
            const previewUrl = getPreviewUrl(item);
            return (
              <div
                key={item.id}
                className="relative aspect-square border rounded-lg overflow-hidden group"
              >
                {previewUrl ? (
                  <>
                    <Image
                      src={previewUrl}
                      alt={`Product image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    />
                    {(item.compressing || item.uploading) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-xs">
                            {item.compressing ? 'Compressing...' : 'Uploading...'}
                          </p>
                        </div>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemove(item.id)}
                      disabled={item.uploading || item.compressing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {index === 0 && (
                      <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Main
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Click to upload images or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, GIF up to 10MB each (will be compressed automatically)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            First image will be used as the main product image
          </p>
        </div>
      )}

      {images.length > 0 && images.length < maxImages && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Add More Images
        </Button>
      )}
    </div>
  );
}

