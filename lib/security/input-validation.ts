/**
 * Input validation utilities
 * Prevents injection attacks and validates user input
 */

/**
 * Sanitize string input - removes potentially dangerous characters
 */
export function sanitizeString(input: string, maxLength?: number): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove null bytes and control characters (except newlines, tabs, carriage returns)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize line breaks
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string' || email.length > 254) {
    return false;
  }

  // RFC 5322 compliant regex (simplified)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  if (typeof uuid !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(uuid);
}

/**
 * Validate URL format (basic check)
 */
export function validateURL(url: string): boolean {
  if (typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate integer within range
 */
export function validateInteger(value: unknown, min?: number, max?: number): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return false;
  }

  if (min !== undefined && value < min) {
    return false;
  }

  if (max !== undefined && value > max) {
    return false;
  }

  return true;
}

/**
 * Validate number within range
 */
export function validateNumber(value: unknown, min?: number, max?: number): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }

  if (min !== undefined && value < min) {
    return false;
  }

  if (max !== undefined && value > max) {
    return false;
  }

  return true;
}

/**
 * Validate array length
 */
export function validateArrayLength<T>(
  arr: unknown,
  minLength?: number,
  maxLength?: number
): arr is T[] {
  if (!Array.isArray(arr)) {
    return false;
  }

  if (minLength !== undefined && arr.length < minLength) {
    return false;
  }

  if (maxLength !== undefined && arr.length > maxLength) {
    return false;
  }

  return true;
}

/**
 * Sanitize HTML content (basic - for simple text content)
 * For rich content, use a proper HTML sanitizer library like DOMPurify
 */
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }

  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');

  // Remove javascript: and data: URLs from links and images
  sanitized = sanitized
    .replace(/href=["']javascript:[^"']*["']/gi, '')
    .replace(/src=["']javascript:[^"']*["']/gi, '')
    .replace(/src=["']data:[^"']*["']/gi, '');

  return sanitized;
}

/**
 * Validate and sanitize product title
 */
export function validateProductTitle(title: string): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} {
  if (typeof title !== 'string') {
    return { valid: false, error: 'Title must be a string' };
  }

  const sanitized = sanitizeString(title, 200);
  if (sanitized.length < 3) {
    return { valid: false, error: 'Title must be at least 3 characters' };
  }

  if (sanitized.length > 200) {
    return { valid: false, error: 'Title must be 200 characters or less' };
  }

  return { valid: true, sanitized };
}

/**
 * Validate and sanitize product description
 */
export function validateProductDescription(description: string): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} {
  if (typeof description !== 'string') {
    return { valid: false, error: 'Description must be a string' };
  }

  const sanitized = sanitizeString(description, 5000);
  if (sanitized.length > 5000) {
    return { valid: false, error: 'Description must be 5000 characters or less' };
  }

  return { valid: true, sanitized };
}

/**
 * Validate price
 */
export function validatePrice(price: unknown): {
  valid: boolean;
  value?: number;
  error?: string;
} {
  if (!validateNumber(price, 0.01, 10000)) {
    return { valid: false, error: 'Price must be between $0.01 and $10,000' };
  }

  // Round to 2 decimal places
  const rounded = Math.round((price as number) * 100) / 100;

  return { valid: true, value: rounded };
}
