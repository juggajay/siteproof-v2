export default async function LotsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Lots Page</h1>
      <p>Project ID: {id}</p>
      <p>This is the lots listing page.</p>
    </div>
  );
}
