// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function SimpleTestPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Simple Test Page</h1>
      <p>If you can see this, basic rendering works.</p>
      <p>Environment: {process.env.NODE_ENV}</p>
      <p>Has Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Yes' : 'No'}</p>
      <p>Has Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</p>
    </div>
  );
}