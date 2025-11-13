# Public Assets Directory

This directory contains static assets that are served directly by Next.js.

## Directory Structure

- `images/` - General images (banners, placeholders, etc.)
- `logos/` - Company/brand logos
- `icons/` - Icon files (if not using a library)

## How to Use

### In React Components

#### Using Next.js Image Component (Recommended)
```tsx
import Image from 'next/image';

<Image 
  src="/logos/your-logo.png" 
  alt="Your Logo" 
  width={200} 
  height={50}
/>
```

#### Using Regular img Tag
```tsx
<img src="/logos/your-logo.png" alt="Your Logo" />
```

#### Using CSS Background
```css
background-image: url('/images/background.jpg');
```

### File Paths

Files in this directory are served from the root URL:
- `public/logos/logo.png` → `/logos/logo.png`
- `public/images/banner.jpg` → `/images/banner.jpg`
- `public/favicon.ico` → `/favicon.ico`

### Best Practices

1. **Optimize Images**: Use WebP format when possible for better performance
2. **Naming Conventions**: Use kebab-case for file names (e.g., `company-logo.svg`)
3. **Organization**: Keep related assets in appropriate subdirectories
4. **Size Limits**: Keep individual files under 1MB when possible

## Examples

### Navigation Logo
```tsx
// components/navigation.tsx
<Link href="/">
  <Image 
    src="/logos/patterns-place-logo.png" 
    alt="The Patterns Place" 
    width={150} 
    height={40}
  />
</Link>
```

### Favicon
Place `favicon.ico` directly in the `public` directory (or use Next.js metadata API)

### Open Graph Images
You can place OG images here, or use Next.js's built-in support in the `app` directory.

 