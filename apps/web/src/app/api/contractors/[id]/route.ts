import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/contractors/[id] - Get contractor details
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('id', id)
      .eq('company_type', 'contractor')
      .single();

    if (error) {
      console.error('Error fetching contractor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Contractor GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/contractors/[id] - Delete contractor
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('company_profiles')
      .delete()
      .eq('id', id)
      .eq('company_type', 'contractor');

    if (error) {
      console.error('Error deleting contractor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Contractor deleted successfully' });
  } catch (error) {
    console.error('Contractor DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
