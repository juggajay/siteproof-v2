import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const layoutSchema = z.object({
  userId: z.string().uuid(),
  layouts: z.any(),
  widgets: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      data: z.any().optional(),
    })
  ),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's dashboard layout
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Return default layout if none exists
      return NextResponse.json({
        layouts: null,
        widgets: null,
      });
    }

    return NextResponse.json({
      layouts: data.layouts,
      widgets: data.widgets,
    });
  } catch (error) {
    console.error('Failed to get dashboard layout:', error);
    return NextResponse.json({ error: 'Failed to get dashboard layout' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { userId, layouts, widgets } = layoutSchema.parse(body);

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Upsert dashboard layout
    const { error } = await supabase.from('dashboard_layouts').upsert(
      {
        user_id: userId,
        layouts,
        widgets,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (error) {
      console.error('Failed to save dashboard layout:', error);
      return NextResponse.json({ error: 'Failed to save dashboard layout' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save dashboard layout:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to save dashboard layout' }, { status: 500 });
  }
}
