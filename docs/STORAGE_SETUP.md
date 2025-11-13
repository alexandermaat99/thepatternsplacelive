# Supabase Storage Setup for Product Images

This guide will help you set up Supabase Storage for product image uploads.

## Prerequisites

- A Supabase project
- Admin access to your Supabase dashboard

## Setup Steps

### 1. Run the Storage SQL Script

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `sql/storage-setup.sql`
4. Run the SQL script

This will:
- Create a public storage bucket named `product-images`
- Set up Row Level Security (RLS) policies for:
  - Public read access (anyone can view images)
  - Authenticated users can upload images
  - Users can only update/delete their own images

### 2. Verify Storage Bucket

1. Go to Storage in your Supabase dashboard
2. You should see a bucket named `product-images`
3. Make sure it's set to **Public** (this allows public read access)

### 3. Test Image Upload

1. Go to `/marketplace/sell` in your app
2. Try uploading an image when creating a product
3. The image should upload and display in the preview

## Storage Structure

Images are stored with the following structure:
```
product-images/
  └── {user_id}/
      └── {timestamp}.{extension}
```

This ensures:
- Each user's images are organized in their own folder
- Images have unique filenames (timestamp-based)
- Easy cleanup if needed

## Security

- **Public Read**: Anyone can view product images (needed for marketplace)
- **Authenticated Upload**: Only logged-in users can upload images
- **User Isolation**: Users can only modify/delete their own images

## File Limits

- **Max file size**: 5MB per image
- **Allowed formats**: PNG, JPG, GIF, WebP
- **Validation**: Client-side validation before upload

## Troubleshooting

### Images not displaying
- Check that the bucket is set to **Public**
- Verify the Next.js config includes Supabase Storage domains
- Check browser console for CORS errors

### Upload fails
- Verify RLS policies are correctly set
- Check that the user is authenticated
- Ensure file size is under 5MB

### Permission errors
- Make sure the storage policies are active
- Verify the user is logged in
- Check that the bucket exists and is named `product-images`

