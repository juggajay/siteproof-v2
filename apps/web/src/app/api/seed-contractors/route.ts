import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You must be an admin to seed contractors' },
        { status: 403 }
      );
    }

    // Sample contractors
    const sampleContractors = [
      {
        organization_id: membership.organization_id,
        company_name: 'ABC Construction Co.',
        company_type: 'contractor',
        primary_contact_name: 'John Smith',
        primary_contact_email: 'john@abcconstruction.com',
        primary_contact_phone: '(555) 123-4567',
        address_line1: '123 Builder Street',
        city: 'Construction City',
        state_province: 'CA',
        postal_code: '90210',
        country: 'US',
        is_active: true,
        is_approved: true,
        created_by: user.id,
        created_at: new Date().toISOString(),
      },
      {
        organization_id: membership.organization_id,
        company_name: 'XYZ Electrical Services',
        company_type: 'contractor',
        primary_contact_name: 'Jane Doe',
        primary_contact_email: 'jane@xyzelectrical.com',
        primary_contact_phone: '(555) 234-5678',
        address_line1: '456 Electric Avenue',
        city: 'Power Town',
        state_province: 'NY',
        postal_code: '10001',
        country: 'US',
        is_active: true,
        is_approved: true,
        created_by: user.id,
        created_at: new Date().toISOString(),
      },
      {
        organization_id: membership.organization_id,
        company_name: 'Premier Plumbing Solutions',
        company_type: 'contractor',
        primary_contact_name: 'Bob Johnson',
        primary_contact_email: 'bob@premierplumbing.com',
        primary_contact_phone: '(555) 345-6789',
        address_line1: '789 Pipe Lane',
        city: 'Water Works',
        state_province: 'TX',
        postal_code: '77001',
        country: 'US',
        is_active: true,
        is_approved: true,
        created_by: user.id,
        created_at: new Date().toISOString(),
      },
    ];

    // Check if contractors already exist
    const { data: existingContractors } = await supabase
      .from('company_profiles')
      .select('company_name')
      .eq('organization_id', membership.organization_id)
      .eq('company_type', 'contractor');

    if (existingContractors && existingContractors.length > 0) {
      return NextResponse.json({
        message: 'Contractors already exist for this organization',
        contractors: existingContractors,
      });
    }

    // Insert sample contractors
    const { data: newContractors, error } = await supabase
      .from('company_profiles')
      .insert(sampleContractors)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Sample contractors created successfully',
      contractors: newContractors,
    });
  } catch (error) {
    console.error('Error seeding contractors:', error);
    return NextResponse.json({ error: 'Failed to seed contractors' }, { status: 500 });
  }
}
