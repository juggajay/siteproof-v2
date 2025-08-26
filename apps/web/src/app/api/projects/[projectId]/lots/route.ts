import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Fetch lots for this project
    // Try with relation first, fallback to simple query if it fails
    let { data: lots, error } = await supabase
      .from('lots')
      .select('*')
      .eq('project_id', projectId)
      .order('lot_number', { ascending: true });

    // If successful, try to fetch related itp_instances separately
    if (!error && lots) {
      // Fetch ITP instances for each lot
      const lotsWithItp = await Promise.all(
        lots.map(async (lot) => {
          const { data: itpInstances } = await supabase
            .from('itp_instances')
            .select('id, status, completion_percentage')
            .eq('lot_id', lot.id);

          return {
            ...lot,
            itp_instances: itpInstances || [],
          };
        })
      );
      lots = lotsWithItp;
    }

    if (error) {
      console.error('Error fetching lots:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch lots',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(lots || []);
  } catch (error) {
    console.error('Lots endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();

    // Create new lot
    const { data: lot, error } = await supabase
      .from('lots')
      .insert({
        ...body,
        project_id: projectId,
        created_by: user.id,
        status: body.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lot:', error);
      return NextResponse.json({ error: 'Failed to create lot' }, { status: 500 });
    }

    return NextResponse.json(lot);
  } catch (error) {
    console.error('Create lot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
