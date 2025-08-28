import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string }> }
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

    const { lotId } = await params;

    // Fetch ITP instances for this lot with template information
    const { data: itpInstances, error } = await supabase
      .from('itp_instances')
      .select(`
        *,
        itp_templates (
          id,
          name,
          description,
          structure,
          organization_id,
          category
        )
      `)
      .eq('lot_id', lotId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ITP instances:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch ITP instances',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Return instances in the format expected by the frontend
    return NextResponse.json({ instances: itpInstances || [] });
  } catch (error) {
    console.error('ITP endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string }> }
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

    const { projectId, lotId } = await params;
    const body = await request.json();

    // Create new ITP instance
    const { data: itpInstance, error } = await supabase
      .from('itp_instances')
      .insert({
        ...body,
        lot_id: lotId,
        project_id: projectId,
        created_by: user.id,
        status: body.status || 'draft',
        completion_percentage: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ITP instance:', error);
      return NextResponse.json({ error: 'Failed to create ITP instance' }, { status: 500 });
    }

    return NextResponse.json(itpInstance);
  } catch (error) {
    console.error('Create ITP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}