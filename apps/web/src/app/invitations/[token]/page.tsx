import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AcceptInvitationForm } from './AcceptInvitationForm';

export const metadata: Metadata = {
  title: 'Accept Invitation - SiteProof',
  description: 'Accept your invitation to join a team on SiteProof',
};

interface PageProps {
  params: {
    token: string;
  };
}

export default async function InvitationPage({ params }: PageProps) {
  const supabase = await createClient();
  
  // Fetch invitation details
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', params.token)
    .single();

  if (error || !invitation) {
    notFound();
  }

  // Fetch organization details
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', invitation.organization_id)
    .single();

  // Fetch inviter details
  const { data: inviter } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('id', invitation.invited_by)
    .single();

  // Add the joined data to invitation
  invitation.organization = organization;
  invitation.inviter = inviter;

  // Check if invitation is expired
  const isExpired = new Date(invitation.expires_at) < new Date();
  
  // Check if invitation is already accepted
  const isAccepted = invitation.status === 'accepted';
  
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900">SiteProof</h1>
        
        {isExpired ? (
          <>
            <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Invitation Expired
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              This invitation has expired. Please contact the person who invited you for a new invitation.
            </p>
          </>
        ) : isAccepted ? (
          <>
            <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Invitation Already Accepted
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              This invitation has already been accepted.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              You're invited to join {invitation.organization?.name}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {invitation.inviter?.full_name || invitation.inviter?.email} has invited you to join as {invitation.role}
            </p>
          </>
        )}
      </div>

      {!isExpired && !isAccepted && (
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
          <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
            <AcceptInvitationForm 
              invitation={{
                token: params.token,
                email: invitation.email,
                organizationName: invitation.organization?.name || '',
                role: invitation.role,
                isLoggedIn: !!user,
                userEmail: user?.email,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}