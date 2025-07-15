// File: apps/web/src/app/dashboard/projects/[id]/lots/[lotId]/debug/page.tsx

export default async function DebugPage({
  params,
}: {
  params: Promise<{ id: string; lotId: string }>;
}) {
  const resolvedParams = await params;

  return (
    <div className="p-8 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Debug Page - Params Test</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Raw Params:</h2>
          <pre className="bg-gray-100 p-4 rounded mt-2">{JSON.stringify(params, null, 2)}</pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Resolved Params:</h2>
          <pre className="bg-gray-100 p-4 rounded mt-2">
            {JSON.stringify(resolvedParams, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Extracted Values:</h2>
          <p>
            Project ID: <code className="bg-gray-200 px-2 py-1 rounded">{resolvedParams.id}</code>
          </p>
          <p>
            Lot ID: <code className="bg-gray-200 px-2 py-1 rounded">{resolvedParams.lotId}</code>
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Test URLs:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <a
                href={`/dashboard/projects/${resolvedParams.id}/lots/${resolvedParams.lotId}`}
                className="text-blue-600 hover:underline"
              >
                Go to Lot Detail Page
              </a>
            </li>
            <li>
              <a
                href={`/api/debug/lot/${resolvedParams.lotId}`}
                className="text-blue-600 hover:underline"
              >
                Test Debug API
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
