'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [pdfUrl, setPdfUrl] = useState(
    'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/sign/product-files/c8815245-5ae9-4f50-80a4-4428c5e08c73/1764136118964-34qel-GMK67_AL65__User_Manual.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hN2I1ZTJhZS00NThlLTRlMWUtOGY5Yi1lMTk3MzUxMWMwNTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9kdWN0LWZpbGVzL2M4ODE1MjQ1LTVhZTktNGY1MC04MGE0LTQ0MjhjNWUwOGM3My8xNzY0MTM2MTE4OTY0LTM0cWVsLUdNSzY3X0FMNjVfX1VzZXJfTWFudWFsLnBkZiIsImlhdCI6MTc2NDMwNTM5MywiZXhwIjoxNzk1ODQxMzkzfQ.2Pdw2bVDfb50kBdkU2Tc3M3VPBWXz7wqLJmRK6adHqE'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendTestEmail = async () => {
    if (!email) {
      setResult({ success: false, message: 'Please enter an email address' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const params = new URLSearchParams({ email });
      if (pdfUrl) {
        params.append('pdfUrl', pdfUrl);
      }
      const response = await fetch(`/api/test-email-send?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `Email sent successfully! Message ID: ${data.messageId || 'N/A'}`,
        });
      } else {
        setResult({ success: false, message: data.error || 'Failed to send email' });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Resend Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your-email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="pdfUrl" className="block text-sm font-medium mb-2">
              PDF URL (Optional - for watermarking test)
            </label>
            <Input
              id="pdfUrl"
              type="url"
              placeholder="https://..."
              value={pdfUrl}
              onChange={e => setPdfUrl(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to send a plain test email, or provide a PDF URL to test watermarking
            </p>
          </div>

          <Button onClick={sendTestEmail} disabled={loading || !email} className="w-full">
            {loading
              ? 'Sending...'
              : pdfUrl
                ? 'Send Test Email with Watermarked PDF'
                : 'Send Test Email'}
          </Button>

          {result && (
            <div
              className={`p-4 rounded-md ${
                result.success
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <p className="font-medium">{result.success ? '✅ Success' : '❌ Error'}</p>
              <p className="text-sm mt-1">{result.message}</p>
            </div>
          )}

          <div className="text-sm text-muted-foreground mt-4">
            <p>
              This will send a test email using the Resend API to verify it's working correctly.
            </p>
            {pdfUrl && (
              <p className="mt-2">
                <strong>PDF Watermarking:</strong> If a PDF URL is provided, it will be downloaded,
                watermarked with your email address, and attached to the email.
              </p>
            )}
            <p className="mt-2">Check your inbox (and spam folder) after clicking the button.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
