import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signUpSchema } from '@/features/auth/schemas/auth.schema';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = signUpSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        {
          message: firstError.message,
          field: firstError.path[0],
        },
        { status: 400 }
      );
    }

    const { email, password, fullName } = validationResult.data;
    const supabase = await createClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        {
          message: 'An account with this email already exists',
          field: 'email',
        },
        { status: 400 }
      );
    }

    // Create the user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error('Supabase signup error:', error);
      
      // Handle specific error cases
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          {
            message: 'An account with this email already exists',
            field: 'email',
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('password')) {
        return NextResponse.json(
          {
            message: error.message,
            field: 'password',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: error.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { message: 'Failed to create account' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup route error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}