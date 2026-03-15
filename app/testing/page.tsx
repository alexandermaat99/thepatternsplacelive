import { createClient } from '@/lib/supabase/server';
import { Navigation } from '@/components/navigation';

const testing = 'this is the test string';

// the simple query

export default async function TestingPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products') // or 'test_table'
    .select('id, title, price') // match your table/columns
    .limit(10);

  const { data: usersData, error: usersError } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url,pattern_points,bio')
    .limit(10);

  if (error) {
    console.error(error);
  }

  type Users = {
    username: string | null;
    pattern_points: number | null;
  };

  type SimpleProduct = {
    id: number;
    title: string | null;
    price: number | null;
  };

  const products = (data ?? []) as SimpleProduct[];
  const users = (usersData ?? []) as Users[];

  return (
    <>
      <Navigation showMarketplaceLinks={true} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">Sandbox: simple query</h1>

        {error && <p className="text-red-500 mb-4">Error loading data: {error.message}</p>}

        {products.length === 0 && !error && (
          <p className="text-muted-foreground">
            No products found. Try adding some rows in Supabase.
          </p>
        )}

        {users.length === 0 && !error && (
          <p className="text-muted-foreground">No users found. Try adding some rows in Supabase.</p>
        )}

        <h2 className="text-2xl font-bold mb-4">Products</h2>

        {products.length > 0 && (
          <ul className="space-y-2">
            {products.map(product => (
              <li key={product.id} className="border rounded p-3 flex items-center justify-between">
                <span>{product.title ?? '(no title)'}</span>
                <span className="text-sm text-muted-foreground">
                  ${product.price?.toFixed(2) ?? '0.00'}
                </span>
              </li>
            ))}
          </ul>
        )}

        <h2 className="text-2xl font-bold mb-4 mt-8">Users</h2>

        <ul className="space-y-2">
          <li className="border rounded p-3 flex items-center justify-between mb-2">
            <span>Pattern Points</span>
            <span>Usernames</span>
          </li>
        </ul>

        {users.length > 0 && (
          <ul className="space-y-2">
            {users.map((user, idx) => (
              <li
                key={user.username ?? idx}
                className="border rounded p-3 flex items-center justify-between"
              >
                <span>{user.pattern_points ?? '(no points)'}</span>
                <span className="text-sm text-muted-foreground">
                  {user.username ?? '(no username)'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
