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

  // Sync images state with parent onChange callback
  React.useEffect(() => {
    onChange(images.map((img) => img.url).filter(Boolean));
  }, [images]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Add new items to state
    setImages((prevImages) => [...prevImages, ...newItems]);

    // Process each file: compress then upload
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      if (!item.file) continue;

      try {
        console.log(`Processing image ${i + 1}/${newItems.length}: ${item.file.name}`);
        
        // Compress image with timeout and fallback
        console.log('Compressing image...');
        let compressedFile: File;
        
        try {
          const compressionPromise = compressImage(item.file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: false, // Disable web worker to avoid hanging issues
          });
          
          const timeoutPromise = new Promise<File>((_, reject) => 
            setTimeout(() => reject(new Error('Compression timed out')), 30000)
          );
          
          compressedFile = await Promise.race([compressionPromise, timeoutPromise]);
          console.log('Compression complete, size:', compressedFile.size);
        } catch (compressionError) {
          console.warn('Compression failed or timed out, using original file:', compressionError);
          // Fallback to original file if compression fails
          compressedFile = item.file;
        }

        // Update item to show it's done compressing, now uploading
        setImages((prevImages) => {
          const itemIndex = prevImages.findIndex((img) => img.id === item.id);
          if (itemIndex === -1) {
            console.warn('Item not found after compression:', item.id);
            return prevImages;
          }
          
          const updated = [...prevImages];
          updated[itemIndex] = {
            ...updated[itemIndex],
            compressing: false,
            uploading: true,
            file: compressedFile,
          };
          return updated;
        });

        // Upload to Supabase with timeout
        console.log('Uploading to Supabase...');
        const uploadPromise = uploadImage(compressedFile, item.id);
        const uploadTimeoutPromise = new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('Upload timed out after 60 seconds')), 60000)
        );
        
        const url = await Promise.race([uploadPromise, uploadTimeoutPromise]);
        console.log('Upload complete, URL:', url);
        
        if (!url) {
          throw new Error('Upload failed: No URL returned');
        }

        // Update item with final URL
        setImages((prevImages) => {
          const finalIndex = prevImages.findIndex((img) => img.id === item.id);
          if (finalIndex === -1) {
            console.warn('Item not found after upload:', item.id);
            return prevImages;
          }
          
          const updated = [...prevImages];
          updated[finalIndex] = {
            ...updated[finalIndex],
            url,
            uploading: false,
            compressing: false,
            file: undefined,
          };
          return updated;
        });
      } catch (error) {
        console.error('Error processing image:', error);
        // Remove failed item and show error
        setImages((prevImages) => {
          const filtered = prevImages.filter((img) => img.id !== item.id);
          return filtered;
        });
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to upload ${item.file.name}: ${errorMsg}`);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (
    file: File,
    itemId: string
  ): Promise<string | null> => {
    try {
      const supabase = createClient();

      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);

      // Upload file
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        // Check if it's a duplicate file error
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          // Try with a different filename
          const retryFileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}-retry.${fileExt}`;
          console.log('Retrying upload with filename:', retryFileName);
          const { data: retryData, error: retryError } = await supabase.storage
            .from('product-images')
            .upload(retryFileName, file, {
              cacheControl: '3600',
              upsert: false,
            });
          
          if (retryError) {
            throw retryError;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(retryData.path);
          console.log('Retry upload successful, URL:', publicUrl);
          return publicUrl;
        }
        throw error;
      }

      if (!data) {
        throw new Error('Upload succeeded but no data returned');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      if (!publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log('Upload successful, public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleRemove = (id: string) => {
    setImages((prevImages) => prevImages.filter((img) => img.id !== id));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setImages((prevImages) => {
      const updated = [...prevImages];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
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

