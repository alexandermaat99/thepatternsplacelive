import { createClient } from '@/lib/supabase/server';

export default async function TestDbPage() {
  const supabase = await createClient();
  
  // Test basic connection
  const { data: testData, error: testError } = await supabase
    .from('products')
    .select('count')
    .limit(1);

  // Test products table
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .limit(5);

  // Test profiles table
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(5);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Basic Connection Test:</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {testError ? `Error: ${JSON.stringify(testError, null, 2)}` : 'Connection successful'}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Products Table:</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {productsError ? `Error: ${JSON.stringify(productsError, null, 2)}` : `Data: ${JSON.stringify(products, null, 2)}`}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Profiles Table:</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {profilesError ? `Error: ${JSON.stringify(profilesError, null, 2)}` : `Data: ${JSON.stringify(profiles, null, 2)}`}
          </pre>
        </div>
      </div>
    </div>
  );
} 