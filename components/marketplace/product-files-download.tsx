'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Download, File, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface ProductFilesDownloadProps {
  productId: string;
  sellerId: string;
  files?: string[]; // Array of storage paths
}

export function ProductFilesDownload({ 
  productId, 
  sellerId, 
  files = [] 
}: ProductFilesDownloadProps) {
  const { user } = useAuth();
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  // Check if user has purchased this product
  useEffect(() => {
    const checkPurchase = async () => {
      if (!user) {
        setHasPurchased(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('orders')
          .select('id')
          .eq('product_id', productId)
          .eq('buyer_id', user.id)
          .eq('status', 'completed')
          .limit(1)
          .maybeSingle();

        setHasPurchased(!!data && !error);
      } catch (error) {
        console.error('Error checking purchase:', error);
        setHasPurchased(false);
      }
    };

    checkPurchase();
  }, [user, productId]);

  const handleDownload = async (filePath: string, fileName: string) => {
    if (!user || !hasPurchased) {
      alert('You must purchase this product to download files.');
      return;
    }

    setDownloading((prev) => new Set(prev).add(filePath));

    try {
      const supabase = createClient();
      
      // Get signed URL for private file (expires in 1 hour)
      const { data, error } = await supabase.storage
        .from('product-files')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error('Failed to generate download URL');
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloaded((prev) => new Set(prev).add(filePath));
    } catch (error) {
      console.error('Error downloading file:', error);
      alert(`Failed to download ${fileName}. Please try again.`);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconClass = 'h-5 w-5 text-muted-foreground';
    
    if (['pdf'].includes(ext || '')) {
      return <File className={`${iconClass} text-red-500`} />;
    }
    if (['zip', 'rar', '7z'].includes(ext || '')) {
      return <File className={`${iconClass} text-yellow-500`} />;
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return <File className={`${iconClass} text-blue-500`} />;
    }
    return <File className={iconClass} />;
  };

  if (files.length === 0) {
    return null;
  }

  if (hasPurchased === null) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Checking purchase status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasPurchased) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Digital Files</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Purchase this product to download the digital files.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download Digital Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {files.map((filePath, index) => {
          const fileName = filePath.split('/').pop() || `File ${index + 1}`;
          const isDownloading = downloading.has(filePath);
          const isDownloaded = downloaded.has(filePath);

          return (
            <div
              key={filePath}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(fileName)}
                <span className="text-sm font-medium truncate">{fileName}</span>
                {isDownloaded && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(filePath, fileName)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </>
                )}
              </Button>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground mt-4">
          Download links expire after 1 hour. You can download again anytime after purchase.
        </p>
      </CardContent>
    </Card>
  );
}

