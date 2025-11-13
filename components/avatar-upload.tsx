'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cropAndCompressAvatar } from '@/lib/image-compression';
import { Upload, X, Camera } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userId: string;
  userInitials: string;
  onUploadComplete: (url: string | null) => void;
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  userId, 
  userInitials,
  onUploadComplete 
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl || null);
  const [justUploaded, setJustUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview with currentAvatarUrl prop when it changes
  // BUT don't override if we just uploaded (to prevent reverting to old photo)
  useEffect(() => {
    if (!justUploaded) {
      console.log('[AVATAR DEBUG] useEffect: Syncing preview with currentAvatarUrl:', currentAvatarUrl);
      setPreview(currentAvatarUrl || null);
    } else {
      console.log('[AVATAR DEBUG] useEffect: Skipping sync because we just uploaded');
      console.log('[AVATAR DEBUG] useEffect: Current URL prop:', currentAvatarUrl);
      console.log('[AVATAR DEBUG] useEffect: Current preview:', preview);
      // Don't reset justUploaded automatically - let it stay true to prevent reverts
      // It will be reset when user uploads again or component unmounts
    }
  }, [currentAvatarUrl, justUploaded]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('[AVATAR DEBUG] No file selected');
      return;
    }

    // Reset justUploaded flag when starting new upload
    setJustUploaded(false);

    console.log('[AVATAR DEBUG] File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB. It will be compressed automatically.');
      return;
    }

    console.log('[AVATAR DEBUG] Starting upload process...');
    console.log('[AVATAR DEBUG] Current avatar URL before upload:', currentAvatarUrl);
    
    setUploading(true);

    try {
      // Crop to square and compress (less aggressive compression)
      console.log('[AVATAR DEBUG] Processing image (crop & compress)...');
      const processedFile = await cropAndCompressAvatar(file, 512, 1.0);
      console.log('[AVATAR DEBUG] Image processed:', {
        name: processedFile.name,
        size: processedFile.size,
        type: processedFile.type
      });
      
      // Create preview from processed file
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('[AVATAR DEBUG] Preview created');
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(processedFile);

      // Upload processed file to Supabase Storage
      console.log('[AVATAR DEBUG] Starting upload to storage...');
      await uploadImage(processedFile);
    } catch (error) {
      console.error('[AVATAR DEBUG] Error processing image:', error);
      alert('Failed to process image. Please try again.');
      setUploading(false);
    }
  };

  const uploadImage = async (file: File) => {
    // Note: uploading is already set to true in handleFileSelect
    
    try {
      const supabase = createClient();
      
      console.log('[AVATAR DEBUG] Step 1: Deleting old avatar files for user:', userId);
      
      // Delete ALL old avatar files for this user (in case extension changed)
      try {
        // List all files in the user's avatar folder
        const { data: files, error: listError } = await supabase.storage
          .from('avatars')
          .list(userId, {
            limit: 100,
            offset: 0,
          });

        console.log('[AVATAR DEBUG] Listed files:', files);
        console.log('[AVATAR DEBUG] List error:', listError);

        if (!listError && files && files.length > 0) {
          // Delete all files in the user's folder
          const filePaths = files.map(f => `${userId}/${f.name}`);
          console.log('[AVATAR DEBUG] Deleting files:', filePaths);
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove(filePaths);
          
          if (deleteError) {
            console.error('[AVATAR DEBUG] Error deleting old files:', deleteError);
          } else {
            console.log('[AVATAR DEBUG] Successfully deleted old files');
          }
        } else {
          console.log('[AVATAR DEBUG] No old files to delete');
        }
      } catch (error) {
        console.error('[AVATAR DEBUG] Error in delete process:', error);
        // If listing fails, try to delete based on currentAvatarUrl
        if (currentAvatarUrl) {
          try {
            const urlParts = currentAvatarUrl.split('/');
            const avatarsIndex = urlParts.findIndex(part => part === 'avatars');
            if (avatarsIndex !== -1 && urlParts.length > avatarsIndex + 1) {
              const oldPath = urlParts.slice(avatarsIndex + 1).join('/');
              console.log('[AVATAR DEBUG] Fallback: Deleting old path:', oldPath);
              await supabase.storage
                .from('avatars')
                .remove([oldPath]);
            }
          } catch (deleteError) {
            console.error('[AVATAR DEBUG] Could not delete old avatar:', deleteError);
          }
        }
      }
      
      // Generate filename (always use .jpg for consistency)
      const fileName = `${userId}/avatar.jpg`;
      console.log('[AVATAR DEBUG] Step 2: Uploading file as:', fileName);
      
      // Upload file (upsert: true to replace existing avatar)
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (error) {
        console.error('[AVATAR DEBUG] Upload error:', error);
        alert(`Failed to upload image: ${error.message}`);
        setUploading(false);
        setPreview(currentAvatarUrl || null); // Revert preview
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      console.log('[AVATAR DEBUG] Step 3: File uploaded successfully, path:', data.path);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);
      
      console.log('[AVATAR DEBUG] Step 4: Generated public URL:', publicUrl);
      console.log('[AVATAR DEBUG] Old URL was:', currentAvatarUrl);
      console.log('[AVATAR DEBUG] URLs match?', publicUrl === currentAvatarUrl);

      // Update profile in database - use upsert to ensure it works
      console.log('[AVATAR DEBUG] Step 5: Updating profile in database...');
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (updateError) {
        console.error('[AVATAR DEBUG] Profile update error:', updateError);
        console.error('[AVATAR DEBUG] Error details:', JSON.stringify(updateError, null, 2));
        alert(`Image uploaded but failed to update profile: ${updateError.message}. Check console for details.`);
        setUploading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      console.log('[AVATAR DEBUG] Step 6: Profile updated in database:', updateData);
      console.log('[AVATAR DEBUG] Updated avatar_url:', updateData?.avatar_url);

      // Wait and verify the update worked
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('avatar_url, updated_at')
        .eq('id', userId)
        .single();

      if (verifyError) {
        console.error('[AVATAR DEBUG] Verification error:', verifyError);
      } else {
        console.log('[AVATAR DEBUG] Step 7: Verified profile in DB:', verifyData);
        console.log('[AVATAR DEBUG] Stored URL:', verifyData.avatar_url);
        console.log('[AVATAR DEBUG] Expected URL:', publicUrl);
        console.log('[AVATAR DEBUG] URLs match?', verifyData.avatar_url === publicUrl);
        
        if (verifyData.avatar_url !== publicUrl) {
          console.error('[AVATAR DEBUG] MISMATCH! Database has different URL than expected!');
          console.error('[AVATAR DEBUG] This suggests the update failed or was reverted');
        }
      }

      // Wait a moment for database to propagate
      console.log('[AVATAR DEBUG] Step 8: Waiting 500ms for DB propagation...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Update preview with new URL (with cache-busting for immediate display)
      // Use a unique timestamp to force browser reload
      const timestamp = Date.now();
      const cacheBustedUrl = `${publicUrl}?t=${timestamp}`;
      console.log('[AVATAR DEBUG] Step 9: Setting preview to:', cacheBustedUrl);
      setJustUploaded(true); // Set flag FIRST to prevent useEffect from reverting
      setPreview(cacheBustedUrl);

      console.log('[AVATAR DEBUG] Step 10: Calling onUploadComplete with:', publicUrl);
      
      // Wait a moment before calling onUploadComplete to ensure DB is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onUploadComplete(publicUrl);
      console.log('[AVATAR DEBUG] Upload complete!');
      
      // Keep justUploaded true permanently - only reset on new upload or explicit reset
    } catch (error) {
      console.error('[AVATAR DEBUG] Upload exception:', error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPreview(currentAvatarUrl || null); // Revert preview
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
      console.log('[AVATAR DEBUG] Upload process finished, uploading set to false');
    }
  };

  const handleRemove = async () => {
    if (!currentAvatarUrl && !preview) return;

    setUploading(true);
    
    try {
      const supabase = createClient();
      
      // Delete ALL avatar files for this user
      try {
        // List all files in the user's avatar folder
        const { data: files, error: listError } = await supabase.storage
          .from('avatars')
          .list(userId, {
            limit: 100,
            offset: 0,
          });

        if (!listError && files && files.length > 0) {
          // Delete all files in the user's folder
          const filePaths = files.map(f => `${userId}/${f.name}`);
          await supabase.storage
            .from('avatars')
            .remove(filePaths);
        }
      } catch (error) {
        // If listing fails, try to delete based on currentAvatarUrl
        if (currentAvatarUrl) {
          try {
            const urlParts = currentAvatarUrl.split('/');
            const avatarsIndex = urlParts.findIndex(part => part === 'avatars');
            if (avatarsIndex !== -1 && urlParts.length > avatarsIndex + 1) {
              const oldPath = urlParts.slice(avatarsIndex + 1).join('/');
              await supabase.storage
                .from('avatars')
                .remove([oldPath]);
            }
          } catch (deleteError) {
            console.log('Could not delete avatar:', deleteError);
          }
        }
      }
      
      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        alert('Avatar deleted but failed to update profile. Please refresh the page.');
        setUploading(false);
        return;
      }

      setPreview(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadComplete(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Use currentAvatarUrl for display, preview for upload preview
  // Add cache-busting to force browser to reload image when URL changes
  const getCacheBustedUrl = (url: string | null | undefined, timestamp?: number) => {
    if (!url) return null;
    const cleanUrl = url.split('?')[0]; // Remove any existing query params
    // Use provided timestamp or current time
    return `${cleanUrl}?v=${timestamp || Date.now()}`;
  };
  
  // Use preview if available (has cache-busting), otherwise add it to currentAvatarUrl
  const displayUrl = preview || getCacheBustedUrl(currentAvatarUrl) || null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-24 w-24" key={displayUrl || 'no-avatar'}>
          <AvatarImage 
            src={displayUrl || undefined} 
            alt="Profile picture"
          />
          <AvatarFallback className="text-2xl">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="h-4 w-4 mr-2" />
          {preview ? 'Change Photo' : 'Upload Photo'}
        </Button>
        {preview && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      
      <p className="text-xs text-muted-foreground text-center">
        PNG, JPG, GIF up to 10MB (auto-compressed)
      </p>
    </div>
  );
}

