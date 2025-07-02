export default function DesignTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Design System Test</h1>
      <p className="text-lg">If you can see this, the route is working!</p>
      
      <div className="mt-8 space-y-4">
        <div className="p-4 bg-blue-500 text-white rounded">
          Primary Color Test
        </div>
        <div className="p-4 bg-gray-200 rounded">
          Secondary Color Test
        </div>
      </div>
    </div>
  );
}