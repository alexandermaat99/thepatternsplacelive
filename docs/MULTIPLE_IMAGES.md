# Multiple Images with Auto-Compression

This feature allows sellers to upload multiple images per product listing with automatic compression to optimize file sizes and prevent UI issues.

## Features

### ✅ Multiple Image Upload
- Upload up to 10 images per product
- Drag and drop or click to select multiple files
- Grid preview of all uploaded images
- First image is automatically set as the main product image

### ✅ Automatic Image Compression
- Images are automatically compressed before upload
- Compression settings:
  - Max file size: 1MB (after compression)
  - Max dimensions: 1920px (width or height)
  - Original files up to 10MB are accepted (will be compressed)
- Compression happens client-side using Web Workers for better performance
- No UI blocking during compression

### ✅ Image Gallery Display
- Product detail pages show an interactive image gallery
- Thumbnail navigation for multiple images
- Fullscreen view with navigation
- Click main image to view fullscreen
- Arrow keys or buttons to navigate between images

### ✅ Backward Compatibility
- Existing products with `image_url` still work
- Migration script converts `image_url` to `images` array
- Both fields are maintained during transition

## Setup

### 1. Run Database Migration

Run the SQL script to add support for multiple images:

```sql
-- Run sql/add-multiple-images.sql in Supabase SQL Editor
```

This will:
- Add `images` JSONB column to products table
- Migrate existing `image_url` values to `images` array
- Keep `image_url` for backward compatibility

### 2. Install Dependencies

The image compression library is already installed:
```bash
npm install browser-image-compression
```

## Usage

### For Sellers

1. Go to `/marketplace/sell`
2. Click "Add Images" or drag and drop images
3. Images are automatically compressed and uploaded
4. See progress indicators during compression and upload
5. Remove images by clicking the X button
6. First image becomes the main product image

### For Buyers

1. View product listings with first image as thumbnail
2. Click product to see full image gallery
3. Navigate through images using thumbnails or arrows
4. Click main image for fullscreen view
5. Use arrow keys or buttons to navigate in fullscreen

## Technical Details

### Image Compression
- Uses `browser-image-compression` library
- Compression happens before upload to reduce storage costs
- Web Worker support for non-blocking compression
- Maintains image quality while reducing file size

### Storage Structure
```
product-images/
  └── {user_id}/
      └── {timestamp}-{random}.{ext}
```

### Database Schema
```sql
-- Products table now has:
image_url TEXT,        -- First image (backward compatibility)
images JSONB,          -- Array of image URLs: ["url1", "url2", ...]
```

### Component Structure
- `MultiImageUpload` - Upload component with compression
- `ProductImageGallery` - Display component with navigation
- `image-compression.ts` - Compression utilities

## Performance

- **Compression**: Happens client-side, no server load
- **Upload**: Only compressed images are uploaded (smaller files)
- **Display**: Next.js Image optimization for fast loading
- **Lazy Loading**: Images load as needed
- **Thumbnails**: Smaller preview images for gallery

## File Size Limits

- **Before Compression**: Up to 10MB per image
- **After Compression**: Max 1MB per image
- **Max Dimensions**: 1920px (width or height)
- **Max Images**: 10 per product

## Browser Support

- Modern browsers with Web Worker support
- File API support required
- Image compression works in all modern browsers

## Troubleshooting

### Images not compressing
- Check browser console for errors
- Ensure file is a valid image format
- Try a smaller image first

### Upload fails
- Check Supabase Storage bucket permissions
- Verify user is authenticated
- Check network connection

### Images not displaying
- Verify Supabase Storage bucket is public
- Check Next.js image configuration
- Verify image URLs are correct

