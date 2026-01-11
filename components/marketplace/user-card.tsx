'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { User } from 'lucide-react';

interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

interface UserCardProps {
  user: UserProfile;
}

export function UserCard({ user }: UserCardProps) {
  const displayName = user.username ? `@${user.username}` : user.full_name || 'User';
  const initials = (user.full_name || user.username || 'U')
    .charAt(0)
    .toUpperCase();

  return (
    <Link href={`/marketplace/seller/${user.username || user.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-300 to-rose-500 flex items-center justify-center text-white text-xl font-bold border-2 border-border">
                  {initials}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{displayName}</h3>
              {user.full_name && user.username && (
                <p className="text-sm text-muted-foreground truncate">{user.full_name}</p>
              )}
              {user.bio && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{user.bio}</p>
              )}
            </div>

            {/* User Icon */}
            <div className="flex-shrink-0 text-muted-foreground">
              <User className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
