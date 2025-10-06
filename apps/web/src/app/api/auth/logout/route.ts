import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Get the current user before signing out
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No active session found' }, { status: 401 });
    }

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
    }

    // Create response with cleared cookies
    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    // Clear auth cookies
    response.cookies.set('sb-access-token', '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    response.cookies.set('sb-refresh-token', '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Support GET method for direct navigation
export async function GET() {
  try {
    const supabase = await createClient();

    // Sign out the user
    await supabase.auth.signOut();

    // Redirect to login page
    return NextResponse.redirect(
      new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  } catch (error) {
    console.error('Logout error:', error);
    // Redirect to login even if there's an error
    return NextResponse.redirect(
      new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }
}
