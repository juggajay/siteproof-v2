import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface InvitationEmailProps {
  inviterName: string;
  inviterEmail: string;
  organizationName: string;
  invitationUrl: string;
  recipientEmail: string;
}

export const InvitationEmail = ({
  inviterName,
  inviterEmail,
  organizationName,
  invitationUrl,
  recipientEmail,
}: InvitationEmailProps) => {
  const previewText = `${inviterName} invited you to join ${organizationName} on SiteProof`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You&apos;re invited to join {organizationName}</Heading>
          
          <Text style={text}>
            Hi there,
          </Text>
          
          <Text style={text}>
            {inviterName} ({inviterEmail}) has invited you to join <strong>{organizationName}</strong> on SiteProof.
          </Text>
          
          <Text style={text}>
            SiteProof is a professional platform for managing website proofs and feedback. Join the team to collaborate on projects and streamline your review process.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={invitationUrl}>
              Accept Invitation
            </Button>
          </Section>

          <Text style={text}>
            This invitation will expire in 7 days. If you don&apos;t want to accept this invitation, you can ignore this email.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            If the button above doesn&apos;t work, you can also click this link:
          </Text>
          <Link href={invitationUrl} style={link}>
            {invitationUrl}
          </Link>

          <Text style={footer}>
            This invitation was sent to {recipientEmail}. If you weren&apos;t expecting this invitation, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

InvitationEmail.PreviewProps = {
  inviterName: 'John Doe',
  inviterEmail: 'john@example.com',
  organizationName: 'Acme Inc',
  invitationUrl: 'https://siteproof.io/invitations/abc123',
  recipientEmail: 'jane@example.com',
} as InvitationEmailProps;

export default InvitationEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 48px 48px',
  marginBottom: '64px',
  borderRadius: '5px',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#697386',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
};

const link = {
  color: '#2563eb',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};