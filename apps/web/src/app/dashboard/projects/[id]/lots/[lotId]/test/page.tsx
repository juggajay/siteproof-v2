export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string; lotId: string }>;
}) {
  const { id, lotId } = await params;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Route Test Page</h1>
      <div className="space-y-2">
        <p>Project ID: {id}</p>
        <p>Lot ID: {lotId}</p>
      </div>
      <pre className="mt-4 p-4 bg-gray-100 rounded">{JSON.stringify({ id, lotId }, null, 2)}</pre>
    </div>
  );
}
