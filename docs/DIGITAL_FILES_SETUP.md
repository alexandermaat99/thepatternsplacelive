# Digital Files Setup Guide

This guide will help you set up digital file uploads and downloads for your marketplace products.

## Overview

Digital files allow sellers to upload files (PDFs, ZIP archives, images, documents, etc.) that buyers can download after purchasing a product. Files are stored securely in a private Supabase Storage bucket.

## Prerequisites

- A Supabase project
- Admin access to your Supabase dashboard
- Products table with `files` column

## Setup Steps

### 1. Create Storage Bucket

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `sql/product-files-storage-setup.sql`
4. Run the SQL script

This will:
- Create a private storage bucket named `product-files`
- Set up Row Level Security (RLS) policies for:
  - Sellers can upload/view/update/delete their own files
  - Buyers can download files for products they've purchased

### 2. Add Files Column to Products Table

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `sql/add-product-files.sql`
4. Run the SQL script

This adds a `files` column (text array) to store file paths.

### 3. Verify Setup

1. Go to Storage in your Supabase dashboard
2. You should see a bucket named `product-files`
3. Make sure it's set to **Private** (not public)
4. Verify the RLS policies are active

## How It Works

### For Sellers

1. **Upload Files**: When creating or editing a product, sellers can upload digital files using the "Digital Files" section
2. **File Storage**: Files are stored in `product-files/{user_id}/{timestamp}-{random}-{filename}`
3. **File Management**: Sellers can add/remove files at any time

### For Buyers

1. **Purchase Required**: Buyers must purchase the product before downloading files
2. **Download Access**: After purchase, a "Download Digital Files" section appears on the product page
3. **Signed URLs**: Files are accessed via signed URLs that expire after 1 hour
4. **Re-download**: Buyers can download files multiple times (new signed URL generated each time)

## File Limits

- **Max files per product**: 10 (configurable in `DigitalFileUpload` component)
- **Max file size**: 100MB per file (configurable)
- **Allowed formats**: Any file type (PDF, ZIP, images, documents, etc.)

## Security

### Storage Policies

- **Private Bucket**: Files are not publicly accessible
- **Seller Access**: Sellers can only access files in their own folder (`{user_id}/`)
- **Buyer Access**: Buyers can only access files from sellers they've purchased from
- **Signed URLs**: Downloads use time-limited signed URLs (1 hour expiry)

### RLS Policies

The storage policies check:
- For sellers: File path starts with their `user_id`
- For buyers: They have a completed order from the seller

## Components

### `DigitalFileUpload`
- Location: `components/marketplace/digital-file-upload.tsx`
- Purpose: Upload component for sellers
- Features:
  - Multiple file upload
  - File size validation
  - Progress indicators
  - File removal

### `ProductFilesDownload`
- Location: `components/marketplace/product-files-download.tsx`
- Purpose: Download component for buyers
- Features:
  - Purchase verification
  - Download buttons for each file
  - Signed URL generation
  - Download status indicators

## Usage

### Adding Files to a Product

1. Go to `/marketplace/sell` or edit an existing product
2. Scroll to the "Digital Files" section
3. Click "Add Files" or drag and drop files
4. Wait for uploads to complete
5. Save the product

### Downloading Files (Buyers)

1. Purchase the product
2. Go to the product detail page
3. Scroll to "Download Digital Files" section
4. Click "Download" next to each file
5. Files will download to your device

## Troubleshooting

### Files not uploading
- Check file size (must be under 100MB)
- Verify user is authenticated
- Check browser console for errors
- Verify storage bucket exists and policies are active

### Buyers can't download
- Verify buyer has completed purchase (check `orders` table)
- Check order status is `completed`
- Verify storage policies are correctly set
- Check browser console for signed URL errors

### Permission errors
- Verify RLS policies are active in Supabase
- Check that file path matches user's folder structure
- Ensure buyer has a completed order from the seller

## File Structure

Files are stored with this structure:
```
product-files/
  └── {user_id}/
      └── {timestamp}-{random}-{filename}
```

This ensures:
- Each seller's files are organized in their own folder
- Files have unique names (timestamp + random string)
- Original filename is preserved (sanitized)

## API Details

### Upload
- Bucket: `product-files`
- Method: `supabase.storage.from('product-files').upload()`
- Path format: `{user_id}/{timestamp}-{random}-{filename}`

### Download
- Bucket: `product-files`
- Method: `supabase.storage.from('product-files').createSignedUrl()`
- Expiry: 3600 seconds (1 hour)
- Access: Only for authenticated users with completed purchases

## Future Enhancements

Potential improvements:
- Per-product file access (currently checks seller, not specific product)
- File preview for images/PDFs
- Download all files as ZIP
- File versioning
- Download analytics

