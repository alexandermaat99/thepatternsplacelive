export default function TestEnvPage() {
  const envVars = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Not set',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set',
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      
      <div className="space-y-2">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="font-mono">{key}:</span>
            <span className={value === 'Not set' ? 'text-red-500' : 'text-green-500'}>
              {key.includes('Key') && value !== 'Not set' ? 'Set (hidden)' : value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 