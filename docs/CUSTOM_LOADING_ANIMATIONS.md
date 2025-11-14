# Custom Loading Animations Guide

This guide explains how to add custom loading animations to your application.

## Supported Formats

### 1. **GIF/WebP Animation** (Easiest)
**Best for:** Simple animations, quick implementation
**File size:** Medium to large
**Scalability:** No (pixelated when scaled)

**Steps:**
1. Add your GIF/WebP file to `public/animations/` folder
2. Update the loading component:

```tsx
<CustomLoading 
  animationType="gif" 
  src="/animations/your-loading.gif"
  size="lg"
/>
```

**Recommended tools:**
- Create GIF: [EZGIF](https://ezgif.com/maker)
- Optimize: [TinyPNG](https://tinypng.com/) or [Squoosh](https://squoosh.app/)

---

### 2. **SVG Animation** (Best Performance)
**Best for:** Scalable, lightweight animations
**File size:** Very small
**Scalability:** Yes (perfect at any size)

**Option A: Inline SVG with CSS Animation**
Already implemented in `CustomLoading` component with `animationType="svg"`

**Option B: Animated SVG File**
1. Create an animated SVG (using tools like [SVGator](https://www.svgator.com/))
2. Save to `public/animations/`
3. Use as image:

```tsx
<Image
  src="/animations/loading.svg"
  alt="Loading"
  width={48}
  height={48}
  className="animate-spin"
/>
```

**Recommended tools:**
- [SVGator](https://www.svgator.com/) - Create animated SVGs
- [LottieFiles](https://lottiefiles.com/) - Free animated SVG icons

---

### 3. **Lottie Animation** (Most Flexible)
**Best for:** Complex animations, professional look
**File size:** Small to medium
**Scalability:** Yes (vector-based)

**Steps:**
1. Install Lottie:
```bash
npm install lottie-react
```

2. Get a Lottie animation:
   - Download from [LottieFiles](https://lottiefiles.com/)
   - Or create with [After Effects + Bodymovin](https://airbnb.io/lottie/)

3. Add JSON file to `public/animations/`

4. Update component:
```tsx
import Lottie from 'lottie-react';

<Lottie 
  animationData={require('/public/animations/loading.json')}
  loop={true}
  className="w-12 h-12"
/>
```

---

### 4. **CSS Animation** (Current Default)
**Best for:** Simple spinners, no files needed
**File size:** 0 bytes (pure CSS)
**Scalability:** Yes

Already implemented - no changes needed!

---

## Implementation Examples

### Replace Current Loading Spinner

**Option 1: Update `LoadingSpinner` component**
```tsx
// components/ui/loading-spinner.tsx
import Image from 'next/image';

export function LoadingSpinner({ size = 'md', text = 'Loading...', className = '' }) {
  return (
    <div className={`text-center ${className}`}>
      <Image
        src="/animations/your-custom-loading.gif"
        alt="Loading"
        width={48}
        height={48}
        className="animate-pulse"
        unoptimized
      />
      {text && <p>{text}</p>}
    </div>
  );
}
```

**Option 2: Create a new component**
```tsx
// components/ui/brand-loading.tsx
export function BrandLoading() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Image
        src="/animations/brand-loader.svg"
        alt="Loading"
        width={64}
        height={64}
      />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}
```

---

## File Structure

```
public/
  animations/
    loading.gif          # GIF animation
    loading.webp         # WebP animation (better compression)
    loading.svg          # Animated SVG
    loading.json         # Lottie animation
    brand-loader.svg     # Custom branded loader
```

---

## Performance Tips

1. **Optimize GIFs:**
   - Use WebP instead of GIF (better compression)
   - Reduce frame count
   - Lower resolution if possible
   - Use [Squoosh](https://squoosh.app/) to compress

2. **SVG Best Practices:**
   - Keep animations simple
   - Use CSS animations when possible
   - Minimize path complexity

3. **Lottie Optimization:**
   - Remove unused assets
   - Simplify shapes
   - Reduce frame rate if acceptable

4. **Loading States:**
   - Show loading immediately (don't wait)
   - Use skeleton screens for content
   - Keep animations under 2 seconds per loop

---

## Recommended Resources

- **Free Animations:**
  - [LottieFiles](https://lottiefiles.com/) - Free Lottie animations
  - [Loading.io](https://loading.io/) - Free loading spinners
  - [CSS Loaders](https://cssloaders.github.io/) - Pure CSS loaders

- **Tools:**
  - [SVGator](https://www.svgator.com/) - Create animated SVGs
  - [After Effects](https://www.adobe.com/products/aftereffects.html) - For Lottie
  - [Squoosh](https://squoosh.app/) - Image optimization

---

## Quick Start

1. Choose your format (GIF is easiest to start)
2. Add animation file to `public/animations/`
3. Update `components/page-loading.tsx`:

```tsx
import Image from 'next/image';

export function PageLoading() {
  return (
    <div className="min-h-[60vh] bg-background flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/animations/your-loading.gif"
          alt="Loading"
          width={64}
          height={64}
          unoptimized
        />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
```

That's it! Your custom loading animation will now appear on all pages.

