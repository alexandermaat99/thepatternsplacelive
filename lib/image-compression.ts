import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

const defaultOptions: CompressionOptions = {
  maxSizeMB: 1, // Compress to max 1MB
  maxWidthOrHeight: 1920, // Max dimension
  useWebWorker: true, // Use web worker for better performance
};

/**
 * Compresses an image file to reduce its size
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file as Blob
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const compressionOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    return compressedFile;
  } catch (error) {
    console.error('Image compression error:', error);
    // Return original file if compression fails
    return file;
  }
}

/**
 * Compresses multiple image files
 * @param files - Array of image files to compress
 * @param options - Compression options
 * @returns Array of compressed files
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  const compressionPromises = files.map((file) => compressImage(file, options));
  return Promise.all(compressionPromises);
}

/**
 * Validates an image file
 * @param file - The file to validate
 * @returns Object with isValid and error message
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Please select an image file' };
  }

  // Check file size (before compression, allow up to 10MB)
  const maxSizeBeforeCompression = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeBeforeCompression) {
    return {
      isValid: false,
      error: 'Image size must be less than 10MB. It will be compressed automatically.',
    };
  }

  return { isValid: true };
}

/**
 * Crops an image to a square (center crop) and compresses it
 * @param file - The image file to process
 * @param size - The size of the square (default: 512px)
 * @param maxSizeMB - Maximum file size after compression (default: 1.0MB for avatars)
 * @returns Processed file as Blob
 */
export async function cropAndCompressAvatar(
  file: File,
  size: number = 512,
  maxSizeMB: number = 1.0
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate crop dimensions (center crop)
        const minDimension = Math.min(img.width, img.height);
        const startX = (img.width - minDimension) / 2;
        const startY = (img.height - minDimension) / 2;
        
        // Create canvas and crop to square
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw cropped and resized image
        ctx.drawImage(
          img,
          startX, startY, minDimension, minDimension, // Source (cropped square)
          0, 0, size, size // Destination (resized to target size)
        );
        
        // Convert to blob
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            
            // Convert blob to File
            const croppedFile = new File([blob], file.name, {
              type: file.type || 'image/jpeg',
              lastModified: Date.now(),
            });
            
            // Compress the cropped image
            try {
              const compressedFile = await compressImage(croppedFile, {
                maxSizeMB,
                maxWidthOrHeight: size,
                useWebWorker: true,
              });
              resolve(compressedFile);
            } catch (error) {
              console.error('Compression error:', error);
              // Return cropped file even if compression fails
              resolve(croppedFile);
            }
          },
          file.type || 'image/jpeg',
          0.95 // Quality (increased from 0.9 for better quality)
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

