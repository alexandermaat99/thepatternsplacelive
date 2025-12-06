'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Edit2, Check, X, Loader2 } from 'lucide-react';
import { sanitizeString } from '@/lib/security/input-validation';

interface BioEditorProps {
  currentBio: string | null;
  onUpdate: (bio: string) => Promise<void>;
}

const MAX_BIO_LENGTH = 500;

export function BioEditor({ currentBio, onUpdate }: BioEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(currentBio || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedBio = bio.trim();

    // Validate length
    if (trimmedBio.length > MAX_BIO_LENGTH) {
      setError(`Bio must be ${MAX_BIO_LENGTH} characters or less`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Sanitize the bio
      const sanitizedBio = sanitizeString(trimmedBio, MAX_BIO_LENGTH);

      await onUpdate(sanitizedBio || '');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update bio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setBio(currentBio || '');
    setIsEditing(false);
    setError(null);
  };

  const handleInputChange = (value: string) => {
    setBio(value);
    setError(null);

    // Real-time validation feedback
    if (value.length > MAX_BIO_LENGTH) {
      setError(`Bio must be ${MAX_BIO_LENGTH} characters or less`);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="bio" className="text-sm font-medium">
              Public Bio:
            </Label>
          </div>
          {currentBio ? (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {currentBio}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No bio added yet. Your bio will be visible on your public seller profile.
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8 p-0 flex-shrink-0"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label htmlFor="bio" className="text-sm font-medium">
            Public Bio:
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={e => handleInputChange(e.target.value)}
            placeholder="Tell potential buyers about yourself, your crafting style, or what makes your patterns special..."
            rows={4}
            maxLength={MAX_BIO_LENGTH + 50} // Allow a bit extra for validation feedback
            className="resize-none mt-1"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              {bio.length} / {MAX_BIO_LENGTH} characters
            </p>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        This bio will be visible on your public seller profile page.
      </p>
    </div>
  );
}
