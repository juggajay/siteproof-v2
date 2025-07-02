import { redirect } from 'next/navigation';

export default function OrganizationSetupPage() {
  // This route is no longer used - redirect to dashboard
  // The dashboard page now handles organization setup
  redirect('/dashboard');
}