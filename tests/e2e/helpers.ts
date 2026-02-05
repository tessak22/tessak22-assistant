import { Page } from '@playwright/test';
import { Pool } from 'pg';

/**
 * Test helper utilities
 */

// Database connection for test setup/teardown
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ivylee_dev',
});

/**
 * Clean up test data for a specific user
 */
export async function cleanupUserData(email: string) {
  const client = await pool.connect();
  try {
    const user = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (user.rows.length > 0) {
      const userId = user.rows[0].id;

      // Delete in correct order to respect foreign keys
      await client.query('DELETE FROM daily_plan_tasks WHERE daily_plan_id IN (SELECT id FROM daily_plans WHERE user_id = $1)', [userId]);
      await client.query('DELETE FROM daily_plans WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM tasks WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM clients WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM accounts WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM verification_tokens WHERE identifier = $1', [email]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  } finally {
    client.release();
  }
}

/**
 * Create a test user directly in the database (bypassing email verification)
 */
export async function createTestUser(email: string): Promise<string> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO users (email, email_verified)
       VALUES ($1, NOW())
       ON CONFLICT (email) DO UPDATE SET email_verified = NOW()
       RETURNING id`,
      [email]
    );
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Create a session for a test user
 */
export async function createTestSession(userId: string): Promise<string> {
  const client = await pool.connect();
  try {
    const sessionToken = 'test-session-' + Math.random().toString(36).substring(7);
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await client.query(
      `INSERT INTO sessions (user_id, session_token, expires)
       VALUES ($1, $2, $3)`,
      [userId, sessionToken, expires]
    );

    return sessionToken;
  } finally {
    client.release();
  }
}

/**
 * Sign in as a test user using the full auth flow
 */
export async function signInAsTestUser(page: Page, email: string) {
  // Go to sign-in page
  await page.goto('/auth/signin');

  // Fill in email
  await page.fill('input[type="email"]', email);

  // Wait for the sign-in API call to complete
  const signInPromise = page.waitForResponse(response =>
    response.url().includes('/api/auth/signin') && response.request().method() === 'POST'
  );

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for sign-in response
  await signInPromise;

  // Small delay to let the redirect happen
  await page.waitForTimeout(500);

  // Get the verification token from the test endpoint
  const response = await page.request.post('http://localhost:3001/api/test-auth', {
    data: { email }
  });

  if (!response.ok()) {
    throw new Error(`Failed to get test auth token: ${response.status()} ${await response.text()}`);
  }

  const { callbackUrl } = await response.json();

  // Navigate to the callback URL (simulating clicking the magic link)
  await page.goto(callbackUrl);

  // Wait for redirect to home page
  await page.waitForURL('/', { timeout: 10000 });

  // Get user ID for cleanup
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    return result.rows[0]?.id;
  } finally {
    client.release();
  }
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse((response) => {
    const url = response.url();
    if (typeof urlPattern === 'string') {
      return url.includes(urlPattern);
    }
    return urlPattern.test(url);
  });
}
