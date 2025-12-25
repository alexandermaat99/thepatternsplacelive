import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function TestProduct404Page() {
  const supabase = await createClient();

  // Get a few active products
  const { data: activeProducts } = await supabase
    .from('products')
    .select('id, title, is_active')
    .eq('is_active', true)
    .limit(5);

  // Get a few inactive products (if any)
  const { data: inactiveProducts } = await supabase
    .from('products')
    .select('id, title, is_active')
    .eq('is_active', false)
    .limit(5);

  // Generate a fake UUID that definitely doesn't exist
  const fakeProductId = '00000000-0000-0000-0000-000000000000';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Product 404 & Sitemap Testing</h1>

      <div className="space-y-8">
        {/* Test 1: Check sitemap */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">1. Test Sitemap</h2>
          <p className="text-muted-foreground mb-4">
            Check that the sitemap only includes active products:
          </p>
          <div className="space-y-2">
            <Button asChild>
              <Link href="/sitemap.xml" target="_blank">
                View Sitemap XML
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Open the sitemap and verify it only contains active products. Count the product URLs
              and compare with active products count below.
            </p>
          </div>
        </section>

        {/* Test 2: Test non-existent product */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">2. Test Non-Existent Product</h2>
          <p className="text-muted-foreground mb-4">
            Test a product ID that doesn't exist (should return 404 with noindex):
          </p>
          <div className="space-y-2">
            <Button asChild variant="outline">
              <Link href={`/marketplace/product/${fakeProductId}`} target="_blank">
                Test Fake Product ID
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              This should show a 404 page. Open DevTools → Network tab, then check the page source
              for &lt;meta name="robots" content="noindex, nofollow"&gt; in the &lt;head&gt;.
            </p>
          </div>
        </section>

        {/* Test 3: Test inactive product */}
        {inactiveProducts && inactiveProducts.length > 0 && (
          <section className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">3. Test Inactive Product</h2>
            <p className="text-muted-foreground mb-4">
              Test an inactive product (should return 404 with noindex):
            </p>
            <div className="space-y-2">
              <Button asChild variant="outline">
                <Link
                  href={`/marketplace/product/${inactiveProducts[0].id}`}
                  target="_blank"
                >
                  Test Inactive Product: {inactiveProducts[0].title}
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                This should show a 404 page with noindex metadata.
              </p>
            </div>
          </section>
        )}

        {/* Test 4: Test active product */}
        {activeProducts && activeProducts.length > 0 && (
          <section className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">4. Test Active Product (Should Work)</h2>
            <p className="text-muted-foreground mb-4">
              Verify active products still work correctly:
            </p>
            <div className="space-y-2">
              <Button asChild>
                <Link
                  href={`/marketplace/product/${activeProducts[0].id}`}
                  target="_blank"
                >
                  Test Active Product: {activeProducts[0].title}
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                This should load normally with indexable metadata.
              </p>
            </div>
          </section>
        )}

        {/* Statistics */}
        <section className="border rounded-lg p-6 bg-muted/50">
          <h2 className="text-xl font-semibold mb-4">Statistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Active Products</p>
              <p className="text-2xl font-bold">{activeProducts?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inactive Products</p>
              <p className="text-2xl font-bold">{inactiveProducts?.length || 0}</p>
            </div>
          </div>
        </section>

        {/* Manual Testing Instructions */}
        <section className="border rounded-lg p-6 bg-blue-50 dark:bg-blue-950">
          <h2 className="text-xl font-semibold mb-4">Manual Testing Checklist</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              <strong>Check Sitemap:</strong> Visit <code>/sitemap.xml</code> and verify it only
              contains active products
            </li>
            <li>
              <strong>Check 404 Metadata:</strong> Visit a non-existent product URL, view page
              source, and verify the &lt;head&gt; contains:{' '}
              <code>&lt;meta name="robots" content="noindex, nofollow"&gt;</code>
            </li>
            <li>
              <strong>Check HTTP Status:</strong> Use browser DevTools → Network tab to verify
              non-existent products return 404 status code
            </li>
            <li>
              <strong>Test with curl:</strong> Run{' '}
              <code>
                curl -I https://thepatternsplace.com/marketplace/product/{fakeProductId}
              </code>{' '}
              to check headers
            </li>
            <li>
              <strong>Verify Active Products:</strong> Ensure active products still load normally
              and have proper SEO metadata
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}

