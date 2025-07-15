// Simple test component to check basic routing
export default function SimpleTest() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Simple Test Page</h1>
      <p>If you can see this, the route is working at a basic level.</p>
      <p>Current time: {new Date().toISOString()}</p>
    </div>
  );
}
