'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2, Loader2 } from 'lucide-react';
import { validateUsernameFormat } from '@/lib/auth-helpers';

interface UsernameEditorProps {
  currentUsername: string | null;
  onUpdate: (newUsername: string) => Promise<void>;
}

export function UsernameEditor({
  currentUsername,
  onUpdate,
}: UsernameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(currentUsername || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Sync username when not editing or when currentUsername changes
    if (!isEditing) {
      setUsername(currentUsername || '');
    }
  }, [currentUsername, isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setUsername(currentUsername || '');
    setError(null);
  };

  const checkUsernameAvailability = async (value: string): Promise<boolean> => {
    if (!value.trim()) {
      return false;
    }

    const formatCheck = validateUsernameFormat(value);
    if (!formatCheck.valid) {
      setError(formatCheck.error || 'Invalid username format');
      return false;
    }

    setIsChecking(true);
    try {
      const response = await fetch(
        `/api/profile/username?username=${encodeURIComponent(value)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error checking username');
        return false;
      }

      if (!data.available) {
        setError('Username is already taken');
        return false;
      }

      setError(null);
      return true;
    } catch (err) {
      setError('Error checking username availability');
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const handleSave = async () => {
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedUsername) {
      setError('Username cannot be empty');
      return;
    }

    // Validate format
    const formatCheck = validateUsernameFormat(trimmedUsername);
    if (!formatCheck.valid) {
      setError(formatCheck.error || 'Invalid username format');
      return;
    }

    // Check if username changed
    if (trimmedUsername === (currentUsername || '').toLowerCase()) {
      setIsEditing(false);
      return;
    }

    // Check availability
    const isAvailable = await checkUsernameAvailability(trimmedUsername);
    if (!isAvailable) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onUpdate(trimmedUsername);
      // Update local state immediately to show the change
      setUsername(trimmedUsername);
      // Small delay to ensure parent state has updated
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update username');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setUsername(value);
    setError(null);

    // Real-time validation feedback
    if (value.trim()) {
      const formatCheck = validateUsernameFormat(value);
      if (!formatCheck.valid && value.length > 0) {
        // Only show error if user has typed something
        setError(formatCheck.error);
      }
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <span className="text-sm font-medium">Username:</span>
          <p className="text-sm text-muted-foreground">
            {currentUsername ? `@${currentUsername}` : 'Not set'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartEdit}
          className="h-8 w-8 p-0"
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
          <label className="text-sm font-medium">Username:</label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">@</span>
            <Input
              value={username}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="username"
              className="flex-1"
              disabled={isLoading}
              maxLength={30}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
          {!error && username.trim() && (
            <p className="text-xs text-muted-foreground mt-1">
              {username.length}/30 characters
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={isLoading || isChecking}
            className="h-8 w-8 p-0"
          >
            {isLoading || isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading || isChecking}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Username can contain letters, numbers, underscores, and hyphens (3-30
        characters)
      </p>
    </div>
  );
}

