import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export default function WatermarkingInfoPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Digital File Delivery & Watermarking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">How It Works</h2>
            <p className="text-muted-foreground mb-4">
              When a buyer purchases your pattern, they automatically receive an email with the
              digital files you've uploaded. This ensures a seamless delivery experience and helps
              protect your intellectual property.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">PDF Watermarking</h2>
            <p className="text-muted-foreground mb-4">
              To discourage unauthorized sharing, all PDF files are automatically watermarked with
              the buyer's email address before delivery. This means:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
              <li>Each PDF is personalized with the buyer's email address</li>
              <li>Watermarks appear on every page of multi-page patterns</li>
              <li>This helps identify the source if patterns are shared without permission</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Watermark Example</h2>
            <p className="text-muted-foreground mb-4">
              Here's what the watermark looks like on a purchased pattern:
            </p>
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="relative w-full aspect-[8.5/11] max-w-md mx-auto">
                <Image
                  src="/photos/markedPattern.png"
                  alt="Example of watermarked PDF pattern"
                  fill
                  className="object-contain rounded"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                The pink boxes highlight where watermarks appear on the pattern
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Watermark Placement</h2>
            <p className="text-muted-foreground mb-4">
              Watermarks appear in two locations on each page:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong>Top-left corner:</strong> Text watermark with "Licensed for personal use
                only: [buyer's email]"
              </li>
              <li>
                <strong>Bottom-left corner:</strong> Text watermark with "Licensed for personal use
                only: [buyer's email]"
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Important Notes</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Watermarking happens automatically - no action required from you</li>
              <li>If watermarking fails for any reason, the original file is still delivered</li>
              <li>
                Watermarks are subtle but visible, designed to deter sharing without being intrusive
              </li>
            </ul>
          </div>


        </CardContent>
      </Card>
    </div>
  );
}
