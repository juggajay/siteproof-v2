import { Resend } from 'resend';
import { render } from '@react-email/render';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
}

export const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key');

export const EMAIL_FROM = process.env.EMAIL_FROM || 'SiteProof <notifications@siteproof.io>';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  text?: string;
}

export async function sendEmail({ to, subject, react, text }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Email would be sent:', { to, subject });
    return { id: 'mock-email-id' };
  }

  try {
    const html = render(react);
    
    const data = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || subject,
    });

    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}