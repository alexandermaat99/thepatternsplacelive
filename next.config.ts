import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Keep optimized images for 31 days. The default (4 hours, since Supabase
    // sends max-age=3600) re-optimized every requested image several times a
    // day, and each re-optimization counts as a Vercel cache write. Uploads
    // always get a new file name, so a long cache never shows an old photo.
    minimumCacheTTL: 2678400,
    // Every width is a separate cached image, so only offer the ones the
    // layouts render. Uploads are capped at 1920px, so 2048/3840 only
    // duplicated the 1920 version. (Defaults: 15 widths.)
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [96, 256, 384],
    // WebP only (the default, stated explicitly): adding AVIF would double writes.
    formats: ['image/webp'],
    // 75 = default for pattern images, 85 = fabric photos (texture detail).
    // 90 was allowed but never used.
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
