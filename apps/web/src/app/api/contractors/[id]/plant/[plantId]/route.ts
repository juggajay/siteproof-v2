import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// DELETE /api/contractors/[contractorId]/plant/[plantId] - Delete plant item
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ contractorId: string; plantId: string }> }
) {
  try {
    const { plantId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase.from('plant_items').delete().eq('id', plantId);

    if (error) {
      console.error('Error deleting plant item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Plant item deleted successfully' });
  } catch (error) {
    console.error('Plant DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
