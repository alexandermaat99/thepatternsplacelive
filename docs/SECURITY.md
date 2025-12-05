# Security Implementation Guide

This document outlines the security measures implemented in The Patterns Place to protect against common vulnerabilities found in AI-coded and vibe-coded applications.

## Table of Contents

1. [Security Headers](#security-headers)
2. [Rate Limiting](#rate-limiting)
3. [Input Validation](#input-validation)
4. [CSRF Protection](#csrf-protection)
5. [XSS Prevention](#xss-prevention)
6. [SQL Injection Prevention](#sql-injection-prevention)
7. [File Upload Security](#file-upload-security)
8. [Authentication & Authorization](#authentication--authorization)
9. [Request Size Limits](#request-size-limits)
10. [Error Handling](#error-handling)
11. [Best Practices](#best-practices)

## Security Headers

Security headers are automatically applied via middleware to all requests. These headers protect against:

- **XSS attacks** (Cross-Site Scripting)
- **Clickjacking**
- **MIME type sniffing**
- **Protocol downgrade attacks**

### Implementation

Located in `lib/security/headers.ts` and applied in `middleware.ts`.

### Headers Set

- `Content-Security-Policy`: Restricts resource loading
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-XSS-Protection`: Enables browser XSS filter
- `Strict-Transport-Security`: Forces HTTPS in production
- `Referrer-Policy`: Controls referrer information
- `Permissions-Policy`: Restricts browser features

## Rate Limiting

Rate limiting prevents abuse and DoS attacks by limiting the number of requests per time window.

### Implementation

Located in `lib/security/rate-limit.ts`.

### Usage in API Routes

```typescript
import { rateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(identifier, RATE_LIMITS.STANDARD);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // ... rest of handler
}
```

### Presets

- `RATE_LIMITS.STRICT`: 10 requests/minute
- `RATE_LIMITS.STANDARD`: 60 requests/minute
- `RATE_LIMITS.LENIENT`: 100 requests/minute
- `RATE_LIMITS.AUTH`: 5 requests/15 minutes (login/registration)
- `RATE_LIMITS.FILE_UPLOAD`: 10 uploads/hour

### Production Considerations

For production, consider using Redis-based rate limiting for distributed systems:

```typescript
// Example with Redis (not implemented, but recommended)
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

## Input Validation

All user input must be validated and sanitized before use.

### Implementation

Located in `lib/security/input-validation.ts`.

### Common Validators

- `sanitizeString()`: Removes dangerous characters
- `validateEmail()`: Validates email format
- `validateUUID()`: Validates UUID format
- `validateURL()`: Validates URL format
- `validateInteger()`: Validates integer within range
- `validateNumber()`: Validates number within range
- `validateArrayLength()`: Validates array length

### Usage

```typescript
import { sanitizeString, validateUUID } from '@/lib/security/input-validation';

// Validate UUID
if (!validateUUID(productId)) {
  return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
}

// Sanitize string
const sanitizedTitle = sanitizeString(title, 200);
```

### Best Practices

1. **Always validate input type** - Check that input is the expected type
2. **Validate format** - Use regex or format validators
3. **Sanitize strings** - Remove control characters and normalize
4. **Enforce length limits** - Prevent buffer overflows
5. **Validate ranges** - Ensure numbers are within expected ranges

## CSRF Protection

CSRF (Cross-Site Request Forgery) protection prevents unauthorized actions from other sites.

### Implementation

Located in `lib/security/csrf.ts`.

### Usage

```typescript
import { requireCSRFToken } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  const csrfCheck = await requireCSRFToken(request);
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: csrfCheck.error }, { status: 403 });
  }

  // ... rest of handler
}
```

### Client-Side

CSRF tokens are automatically set in cookies. Include the token in requests:

```typescript
const token = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf-token='))
  ?.split('=')[1];

fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token,
  },
});
```

### Exemptions

Webhook endpoints (e.g., Stripe webhooks) are exempt from CSRF checks as they use signature verification instead.

## XSS Prevention

XSS (Cross-Site Scripting) attacks inject malicious scripts into web pages.

### Prevention Strategies

1. **Sanitize all user input** - Use `sanitizeString()` or `sanitizeHTML()`
2. **Escape output** - React automatically escapes, but be careful with `dangerouslySetInnerHTML`
3. **Content Security Policy** - Restricts script execution
4. **Validate URLs** - Prevent `javascript:` and `data:` URLs

### Structured Data

When using `dangerouslySetInnerHTML` for JSON-LD, escape HTML entities:

```typescript
const jsonString = JSON.stringify(structuredData)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');
```

### Rich Text Content

For rich text content, use a proper HTML sanitizer like DOMPurify:

```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(userContent);
```

## SQL Injection Prevention

Supabase uses parameterized queries, which prevents SQL injection. However, always:

1. **Use Supabase query builder** - Never concatenate SQL strings
2. **Validate input** - Ensure UUIDs, numbers, etc. are valid before querying
3. **Use RLS policies** - Row Level Security prevents unauthorized data access

### Example

```typescript
// ✅ Good - Parameterized query
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('id', productId) // productId is validated as UUID
  .single();

// ❌ Bad - Never do this
const { data } = await supabase.rpc('get_product', { id: productId });
// Even with RPC, validate productId first
```

## File Upload Security

File uploads are a common attack vector. Implement multiple layers of protection:

### Validation

1. **File type validation** - Check MIME type and extension
2. **File size limits** - Enforce maximum file sizes
3. **File name sanitization** - Remove dangerous characters
4. **Content scanning** - Consider virus scanning in production

### Implementation

```typescript
// Validate file type
if (!file.type.startsWith('image/')) {
  return { error: 'Only image files are allowed' };
}

// Validate file size
const maxSize = 10 * 1024 * 1024; // 10MB
if (file.size > maxSize) {
  return { error: 'File too large' };
}

// Sanitize filename
const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 255);
```

### Storage

- Store files in Supabase Storage with proper RLS policies
- Use signed URLs for private files
- Never serve user-uploaded files directly from the application server

## Authentication & Authorization

### Authentication

- Use Supabase Auth for authentication
- Always verify user identity on protected routes:

```typescript
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Authorization

- Use Row Level Security (RLS) policies in Supabase
- Verify ownership before allowing updates/deletes:

```typescript
// Verify user owns the resource
const { data: resource } = await supabase
  .from('resources')
  .select('user_id')
  .eq('id', resourceId)
  .single();

if (resource.user_id !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Request Size Limits

Prevent DoS attacks from large payloads:

### Implementation

Located in `lib/security/request-limits.ts`.

### Usage

```typescript
import { validateRequestBodySize, REQUEST_LIMITS } from '@/lib/security/request-limits';

const contentLength = request.headers.get('content-length');
const validation = validateRequestBodySize(contentLength, REQUEST_LIMITS.MAX_BODY_SIZE);

if (!validation.valid) {
  return NextResponse.json({ error: validation.error }, { status: 413 });
}
```

### Limits

- **Standard requests**: 1MB
- **File uploads**: 10MB
- **URL length**: 2048 characters
- **Query parameters**: 50 max
- **Request timeout**: 30 seconds

## Error Handling

Never expose sensitive information in error messages:

### Good Error Messages

```typescript
// ✅ Good - Generic error, log details server-side
console.error('Database error:', error);
return NextResponse.json({ error: 'An error occurred. Please try again later.' }, { status: 500 });
```

### Bad Error Messages

```typescript
// ❌ Bad - Exposes database structure
return NextResponse.json({ error: `SQL error: ${error.message}` }, { status: 500 });

// ❌ Bad - Exposes file paths
return NextResponse.json(
  { error: `File not found: /var/www/uploads/${filename}` },
  { status: 404 }
);
```

### Logging

- Log detailed errors server-side
- Never log sensitive data (passwords, tokens, PII)
- Use structured logging in production

## Best Practices

### General

1. **Principle of Least Privilege** - Users should only have access to what they need
2. **Defense in Depth** - Multiple layers of security
3. **Fail Securely** - Default to denying access
4. **Keep Dependencies Updated** - Regularly update npm packages
5. **Use Environment Variables** - Never commit secrets to git

### Code Review Checklist

- [ ] All user input is validated
- [ ] All user input is sanitized
- [ ] Rate limiting is applied
- [ ] Authentication is verified
- [ ] Authorization is checked
- [ ] Error messages don't leak information
- [ ] File uploads are validated
- [ ] SQL queries use parameterized queries
- [ ] CSRF protection is enabled for state-changing operations
- [ ] Security headers are set

### Production Checklist

- [ ] Environment variables are set securely
- [ ] HTTPS is enforced
- [ ] Security headers are configured
- [ ] Rate limiting is configured (consider Redis for distributed systems)
- [ ] File upload limits are enforced
- [ ] Error logging is configured (without sensitive data)
- [ ] Monitoring and alerting is set up
- [ ] Regular security audits are scheduled
- [ ] Dependencies are kept up to date
- [ ] Database backups are configured

### Common Vulnerabilities to Watch For

1. **Injection attacks** - SQL, NoSQL, Command, LDAP
2. **Broken Authentication** - Weak passwords, session fixation
3. **Sensitive Data Exposure** - Unencrypted data, weak encryption
4. **XML External Entities (XXE)** - Not applicable for this stack
5. **Broken Access Control** - Missing authorization checks
6. **Security Misconfiguration** - Default credentials, exposed debug info
7. **XSS** - Stored, reflected, DOM-based
8. **Insecure Deserialization** - Not applicable for this stack
9. **Using Components with Known Vulnerabilities** - Outdated dependencies
10. **Insufficient Logging & Monitoring** - Missing security events

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)
