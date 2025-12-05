/**
 * File upload security utilities
 * Validates and sanitizes file uploads to prevent malicious files
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
}

/**
 * Allowed MIME types for images
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

/**
 * Allowed MIME types for PDFs
 */
export const ALLOWED_PDF_TYPES = ['application/pdf'] as const;

/**
 * Allowed file extensions
 */
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] as const;
export const ALLOWED_PDF_EXTENSIONS = ['.pdf'] as const;

/**
 * Maximum file sizes
 */
export const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  PDF: 100 * 1024 * 1024, // 100MB
  AVATAR: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Validate image file
 */
export function validateImageFile(file: File): FileValidationResult {
  // Check file type
  if (!file.type || !ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    // Fallback: check extension
    const extension = getFileExtension(file.name);
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension.toLowerCase() as any)) {
      return {
        valid: false,
        error: 'Invalid file type. Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed.',
      };
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES.IMAGE) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZES.IMAGE / 1024 / 1024}MB`,
    };
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name);

  return {
    valid: true,
    sanitizedFilename,
  };
}

/**
 * Validate PDF file
 */
export function validatePDFFile(file: File): FileValidationResult {
  // Check file type
  if (!file.type || !ALLOWED_PDF_TYPES.includes(file.type as any)) {
    // Fallback: check extension
    const extension = getFileExtension(file.name);
    if (!ALLOWED_PDF_EXTENSIONS.includes(extension.toLowerCase() as any)) {
      return {
        valid: false,
        error: 'Invalid file type. Only PDF files are allowed.',
      };
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES.PDF) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZES.PDF / 1024 / 1024}MB`,
    };
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name);

  return {
    valid: true,
    sanitizedFilename,
  };
}

/**
 * Validate avatar file
 */
export function validateAvatarFile(file: File): FileValidationResult {
  // Check file type (no SVG for avatars due to security concerns)
  const allowedTypes = ALLOWED_IMAGE_TYPES.filter(t => t !== 'image/svg+xml');
  if (!file.type || !allowedTypes.includes(file.type as any)) {
    const extension = getFileExtension(file.name);
    const allowedExtensions = ALLOWED_IMAGE_EXTENSIONS.filter(e => e !== '.svg');
    if (!allowedExtensions.includes(extension.toLowerCase() as any)) {
      return {
        valid: false,
        error:
          'Invalid file type. Only image files (JPEG, PNG, GIF, WebP) are allowed for avatars.',
      };
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES.AVATAR) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZES.AVATAR / 1024 / 1024}MB`,
    };
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name);

  return {
    valid: true,
    sanitizedFilename,
  };
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'file';
  }

  // Remove path components
  let sanitized = filename.split('/').pop()?.split('\\').pop() || filename;

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, '_');

  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const extension = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.slice(0, sanitized.length - extension.length);
    sanitized = nameWithoutExt.slice(0, maxLength - extension.length) + extension;
  }

  // Ensure it's not empty
  if (!sanitized || sanitized.trim().length === 0) {
    sanitized = 'file';
  }

  return sanitized;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.slice(lastDot);
}

/**
 * Check if file is potentially malicious based on content
 * This is a basic check - consider using a proper virus scanner in production
 */
export async function checkFileContent(file: File): Promise<{ safe: boolean; reason?: string }> {
  // Check for executable signatures (basic check)
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 4)); // Check first 4 bytes

  // Check for common executable signatures
  const executableSignatures = [
    [0x4d, 0x5a], // MZ (PE/EXE)
    [0x7f, 0x45, 0x4c, 0x46], // ELF
    [0xca, 0xfe, 0xba, 0xbe], // Java class
    [0xfe, 0xed, 0xfa, 0xce], // Mach-O
  ];

  for (const signature of executableSignatures) {
    let matches = true;
    for (let i = 0; i < signature.length && i < bytes.length; i++) {
      if (bytes[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return {
        safe: false,
        reason: 'File appears to be an executable, which is not allowed',
      };
    }
  }

  return { safe: true };
}

/**
 * Production recommendation: Use a proper virus scanning service
 *
 * Options:
 * - ClamAV (open source, self-hosted)
 * - VirusTotal API
 * - AWS GuardDuty
 * - Cloudflare Workers with virus scanning
 *
 * Example integration:
 *
 * ```typescript
 * import { scanFile } from '@/lib/security/virus-scanner';
 *
 * const scanResult = await scanFile(file);
 * if (!scanResult.safe) {
 *   return { valid: false, error: 'File failed security scan' };
 * }
 * ```
 */
