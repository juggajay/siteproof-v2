import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// DELETE /api/contractors/[contractorId]/workers/[workerId] - Delete worker
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ contractorId: string; workerId: string }> }
) {
  try {
    const { workerId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase.from('workers').delete().eq('id', workerId);

    if (error) {
      console.error('Error deleting worker:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Worker deleted successfully' });
  } catch (error) {
    console.error('Worker DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
