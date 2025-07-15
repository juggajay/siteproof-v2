import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: Promise<{ lotId: string }> }) {
  try {
    const { lotId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Simple query to check if lot exists
    const { data: lot, error } = await supabase.from('lots').select('*').eq('id', lotId).single();

    return NextResponse.json({
      lotId,
      lotFound: !!lot,
      lot,
      error: error?.message,
    });
  } catch (error) {
    console.error('Debug lot error:', error);
    return NextResponse.json(
      {
        message: 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
