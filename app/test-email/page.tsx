import { notFound } from 'next/navigation';

export default function TestEmailPage() {
  // Test page disabled - return 404
  notFound();

  /* DISABLED - Test email page
  'use client';

  import { useState } from 'react';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Textarea } from '@/components/ui/textarea';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

  export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [pdfUrl, setPdfUrl] = useState(
    'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/sign/product-files/c8815245-5ae9-4f50-80a4-4428c5e08c73/1764136118964-34qel-GMK67_AL65__User_Manual.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hN2I1ZTJhZS00NThlLTRlMWUtOGY5Yi1lMTk3MzUxMWMwNTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9kdWN0LWZpbGVzL2M4ODE1MjQ1LTVhZTktNGY1MC04MGE0LTQ0MjhjNWUwOGM3My8xNzY0MTM2MTE4OTY0LTM0cWVsLUdNSzY3X0FMNjVfX1VzZXJfTWFudWFsLnBkZiIsImlhdCI6MTc2NDMwNTM5MywiZXhwIjoxNzk1ODQxMzkzfQ.2Pdw2bVDfb50kBdkU2Tc3M3VPBWXz7wqLJmRK6adHqE'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Purchase email test fields
  const [purchaseEmail, setPurchaseEmail] = useState('');
  const [productTitle, setProductTitle] = useState('Test Pattern - Sample Product');
  const [productDescription, setProductDescription] = useState(
    'This is a test product description for testing the purchase email template.'
  );
  const [customerName, setCustomerName] = useState('Test Customer');
  const [sellerName, setSellerName] = useState('Test Seller');
  const [orderId, setOrderId] = useState(`TEST-${Date.now()}`);
  const [purchasePdfUrl, setPurchasePdfUrl] = useState(
    'https://gwvoordtliaptzoffgew.supabase.co/storage/v1/object/sign/product-files/c8815245-5ae9-4f50-80a4-4428c5e08c73/1764136118964-34qel-GMK67_AL65__User_Manual.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hN2I1ZTJhZS00NThlLTRlMWUtOGY5Yi1lMTk3MzUxMWMwNTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9kdWN0LWZpbGVzL2M4ODE1MjQ1LTVhZTktNGY1MC04MGE0LTQ0MjhjNWUwOGM3My8xNzY0MTM2MTE4OTY0LTM0cWVsLUdNSzY3X0FMNjVfX1VzZXJfTWFudWFsLnBkZiIsImlhdCI6MTc2NDMwNTM5MywiZXhwIjoxNzk1ODQxMzkzfQ.2Pdw2bVDfb50kBdkU2Tc3M3VPBWXz7wqLJmRK6adHqE'
  );
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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

  const sendPurchaseEmail = async () => {
    if (!purchaseEmail) {
      setPurchaseResult({ success: false, message: 'Please enter an email address' });
      return;
    }

    if (!productTitle) {
      setPurchaseResult({ success: false, message: 'Please enter a product title' });
      return;
    }

    setPurchaseLoading(true);
    setPurchaseResult(null);

    try {
      const response = await fetch('/api/test-purchase-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: purchaseEmail,
          productTitle,
          productDescription: productDescription || undefined,
          customerName: customerName || undefined,
          sellerName: sellerName || undefined,
          orderId: orderId || `TEST-${Date.now()}`,
          pdfUrl: purchasePdfUrl || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPurchaseResult({
          success: true,
          message: `Purchase email sent successfully! Message ID: ${data.messageId || 'N/A'}`,
        });
      } else {
        setPurchaseResult({ success: false, message: data.error || 'Failed to send email' });
      }
    } catch (error) {
      setPurchaseResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Email Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="simple" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simple">Simple Test Email</TabsTrigger>
              <TabsTrigger value="purchase">Purchase Completion Email</TabsTrigger>
            </TabsList>

            <TabsContent value="simple" className="space-y-4 mt-4">
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
                    <strong>PDF Watermarking:</strong> If a PDF URL is provided, it will be
                    downloaded, watermarked with your email address, and attached to the email.
                  </p>
                )}
                <p className="mt-2">
                  Check your inbox (and spam folder) after clicking the button.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="purchase" className="space-y-4 mt-4">
              <div>
                <label htmlFor="purchaseEmail" className="block text-sm font-medium mb-2">
                  Customer Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  id="purchaseEmail"
                  type="email"
                  placeholder="customer@example.com"
                  value={purchaseEmail}
                  onChange={e => setPurchaseEmail(e.target.value)}
                  disabled={purchaseLoading}
                />
              </div>

              <div>
                <label htmlFor="customerName" className="block text-sm font-medium mb-2">
                  Customer Name (Optional)
                </label>
                <Input
                  id="customerName"
                  type="text"
                  placeholder="John Doe"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  disabled={purchaseLoading}
                />
              </div>

              <div>
                <label htmlFor="productTitle" className="block text-sm font-medium mb-2">
                  Product Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="productTitle"
                  type="text"
                  placeholder="Coastal Breeze Blouse Pattern"
                  value={productTitle}
                  onChange={e => setProductTitle(e.target.value)}
                  disabled={purchaseLoading}
                />
              </div>

              <div>
                <label htmlFor="productDescription" className="block text-sm font-medium mb-2">
                  Product Description (Optional)
                </label>
                <Textarea
                  id="productDescription"
                  placeholder="A beautiful pattern for..."
                  value={productDescription}
                  onChange={e => setProductDescription(e.target.value)}
                  disabled={purchaseLoading}
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="sellerName" className="block text-sm font-medium mb-2">
                  Seller Name (Optional)
                </label>
                <Input
                  id="sellerName"
                  type="text"
                  placeholder="Pattern Creator"
                  value={sellerName}
                  onChange={e => setSellerName(e.target.value)}
                  disabled={purchaseLoading}
                />
              </div>

              <div>
                <label htmlFor="orderId" className="block text-sm font-medium mb-2">
                  Order ID
                </label>
                <Input
                  id="orderId"
                  type="text"
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  disabled={purchaseLoading}
                />
              </div>

              <div>
                <label htmlFor="purchasePdfUrl" className="block text-sm font-medium mb-2">
                  PDF URL (Optional - for watermarking test)
                </label>
                <Input
                  id="purchasePdfUrl"
                  type="url"
                  placeholder="https://..."
                  value={purchasePdfUrl}
                  onChange={e => setPurchasePdfUrl(e.target.value)}
                  disabled={purchaseLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Provide a PDF URL to test watermarking with the purchase email template
                </p>
              </div>

              <Button
                onClick={sendPurchaseEmail}
                disabled={purchaseLoading || !purchaseEmail || !productTitle}
                className="w-full"
              >
                {purchaseLoading ? 'Sending...' : 'Send Purchase Completion Email'}
              </Button>

              {purchaseResult && (
                <div
                  className={`p-4 rounded-md ${
                    purchaseResult.success
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <p className="font-medium">
                    {purchaseResult.success ? '✅ Success' : '❌ Error'}
                  </p>
                  <p className="text-sm mt-1">{purchaseResult.message}</p>
                </div>
              )}

              <div className="text-sm text-muted-foreground mt-4">
                <p>
                  This will send a test purchase completion email using the same template that
                  customers receive after purchasing a product.
                </p>
                {purchasePdfUrl && (
                  <p className="mt-2">
                    <strong>PDF Watermarking:</strong> If a PDF URL is provided, it will be
                    downloaded, watermarked with the customer email, and attached to the email.
                  </p>
                )}
                <p className="mt-2">
                  Check your inbox (and spam folder) after clicking the button.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
  */
}
