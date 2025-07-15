import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get information about itp_instances table structure
    const { data: columns, error } = await supabase.from('itp_instances').select('*').limit(0);

    if (error) {
      console.error('Error checking itp_instances:', error);
      return NextResponse.json(
        {
          message: 'Error checking database',
          error: error.message,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    // Also try to get a sample row to see actual structure
    const { data: sampleRow, error: sampleError } = await supabase
      .from('itp_instances')
      .select('*')
      .limit(1)
      .single();

    return NextResponse.json({
      message: 'Database check completed',
      sampleRow: sampleRow || 'No rows found',
      sampleError: sampleError?.message || null,
      columnCheck: 'Check browser network tab for actual columns returned',
    });
  } catch (error) {
    console.error('Debug check error:', error);
    return NextResponse.json(
      {
        message: 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
