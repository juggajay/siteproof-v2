import { NextResponse } from 'next/server';

export async function GET() {
  // VAPID public key (you should generate this and store in env vars)
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    'BNOJyTgwrEwK9lbetRcougxkRgLpPs1DdhpQx0TDqirYasjGleEwnFcFNlQQPZRVV4bdmBqp6lJlJgmNHSzvVtc';

  return NextResponse.json({ publicKey });
}
