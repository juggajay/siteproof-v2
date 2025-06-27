import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import InvitationEmail from '@/emails/InvitationEmail';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id;
    const body = await request.json();
    
    // Validate request body
    const validationResult = inviteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, role } = validationResult.data;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to invite (admin or owner)
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { message: 'You do not have permission to invite members' },
        { status: 403 }
      );
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (!organization) {
      return NextResponse.json(
        { message: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('users')
      .select(`
        id,
        organization_members!inner(
          organization_id
        )
      `)
      .eq('email', email)
      .eq('organization_members.organization_id', organizationId)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { message: 'This user is already a member of the organization' },
        { status: 400 }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { message: 'An invitation has already been sent to this email' },
        { status: 400 }
      );
    }

    // Get inviter details
    const { data: inviter } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: user.id,
      })
      .select('id, token')
      .single();

    if (invitationError || !invitation) {
      console.error('Failed to create invitation:', invitationError);
      return NextResponse.json(
        { message: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Send invitation email
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/${invitation.token}`;
    
    try {
      await sendEmail({
        to: email,
        subject: `You're invited to join ${organization.name} on SiteProof`,
        react: InvitationEmail({
          inviterName: inviter?.full_name || inviter?.email || 'A team member',
          inviterEmail: inviter?.email || '',
          organizationName: organization.name,
          invitationUrl,
          recipientEmail: email,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails - invitation is still created
    }

    return NextResponse.json(
      {
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          email,
          role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Invite route error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Get pending invitations for an organization
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a member of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { message: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Get pending invitations
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        created_at,
        expires_at,
        inviter:invited_by (
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch invitations:', error);
      return NextResponse.json(
        { message: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { invitations: invitations || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}