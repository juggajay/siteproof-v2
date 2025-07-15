// File: apps/web/src/app/dashboard/projects/[...slug]/page.tsx

export default function CatchAllPage({ params }: { params: { slug: string[] } }) {
  return (
    <div className="p-8 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Catch-all Debug Page</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">URL Segments:</h2>
          <pre className="bg-gray-100 p-4 rounded mt-2">{JSON.stringify(params.slug, null, 2)}</pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Full Path:</h2>
          <p className="bg-gray-100 p-4 rounded mt-2">
            /dashboard/projects/{params.slug?.join('/')}
          </p>
        </div>

        {params.slug && params.slug.length >= 3 && params.slug[1] === 'lots' && (
          <div>
            <h2 className="text-lg font-semibold">Parsed as Lot Route:</h2>
            <p>
              Project ID: <code className="bg-gray-200 px-2 py-1 rounded">{params.slug[0]}</code>
            </p>
            <p>
              Lot ID: <code className="bg-gray-200 px-2 py-1 rounded">{params.slug[2]}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
