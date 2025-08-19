import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createCompanySchema = z.object({
  organization_id: z.string().uuid(),
  company_name: z.string().min(1),
  company_type: z.enum(['contractor', 'supplier', 'consultant', 'employee']),
  primary_contact_name: z.string().optional(),
  primary_contact_email: z.string().email().optional(),
  primary_contact_phone: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organization_id');
    const companyType = searchParams.get('company_type');

    let query = supabase
      .from('company_profiles')
      .select('*')
      .eq('is_active', true)
      .order('company_name');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (companyType) {
      query = query.eq('company_type', companyType);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ companies: data || [] });
  } catch (error) {
    console.error('Error fetching company profiles:', error);
    return NextResponse.json({ error: 'Failed to fetch company profiles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCompanySchema.parse(body);

    // Check user has permission in the organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', validatedData.organization_id)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to create company profiles' },
        { status: 403 }
      );
    }

    // Create company profile
    const { data: company, error } = await supabase
      .from('company_profiles')
      .insert({
        ...validatedData,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Company profile created successfully',
      company,
    });
  } catch (error) {
    console.error('Error creating company profile:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create company profile' }, { status: 500 });
  }
}
