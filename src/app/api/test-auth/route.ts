import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Test-only endpoint to get verification tokens for E2E testing
 * This allows tests to complete the auth flow without sending emails
 */
export async function POST(request: NextRequest) {
  // ONLY enable in test/dev environment
  if (process.env.NODE_ENV === 'production' && process.env.PLAYWRIGHT_TEST !== 'true') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Get the latest verification token for this email
    const result = await pool.query(
      `SELECT token, expires FROM verification_tokens
       WHERE identifier = $1
       ORDER BY expires DESC
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No token found' }, { status: 404 });
    }

    const { token, expires } = result.rows[0];

    // Check if token is expired
    if (new Date(expires) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 });
    }

    // Return the callback URL that would have been in the email
    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/resend?callbackUrl=${encodeURIComponent('/')}&token=${token}&email=${encodeURIComponent(email)}`;

    return NextResponse.json({
      token,
      callbackUrl,
      expires
    });
  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
