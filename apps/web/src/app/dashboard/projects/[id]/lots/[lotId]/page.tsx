interface PageProps {
  params: Promise<{ id: string; lotId: string }>;
}

export default async function LotDetailPage({ params }: PageProps) {
  const { id: projectId, lotId } = await params;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Lot Detail Page - Minimal Test</h1>
      <p>Project ID: {projectId}</p>
      <p>Lot ID: {lotId}</p>
      <p className="mt-4 text-green-600">If you can see this, the route is working!</p>
    </div>
  );
}
