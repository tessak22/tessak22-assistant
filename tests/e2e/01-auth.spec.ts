import { test, expect } from '@playwright/test';
import { cleanupUserData, signInAsTestUser } from './helpers';

const TEST_USER = 'test-auth@example.com';

test.describe('Authentication', () => {
  // Clean up before and after tests
  test.beforeEach(async () => {
    await cleanupUserData(TEST_USER);
  });

  test.afterEach(async () => {
    await cleanupUserData(TEST_USER);
  });

  test('should redirect unauthenticated users to sign-in page', async ({ page }) => {
    await page.goto('/');

    // Should be redirected to sign-in
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.locator('h1')).toContainText('Ivy Lee Task Tracker');
  });

  test('should show sign-in form with email input', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should validate email input', async ({ page }) => {
    await page.goto('/auth/signin');

    // Try to submit without email
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // HTML5 validation should prevent submission
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('should allow authenticated user to access home page', async ({ page }) => {
    // Sign in as test user
    await signInAsTestUser(page, TEST_USER);

    // Visit home page
    await page.goto('/');

    // Should not be redirected
    await expect(page).toHaveURL('/');

    // Should see the home page content
    await expect(page.locator('h1')).toContainText('Today');
  });

  test('should show user in navigation after sign-in', async ({ page }) => {
    // Sign in as test user
    await signInAsTestUser(page, TEST_USER);

    // Visit home page
    await page.goto('/');

    // Should see user email or sign out button
    const signOutButton = page.locator('button', { hasText: /sign out/i });
    await expect(signOutButton).toBeVisible();
  });

  test('should sign out user when clicking sign out button', async ({ page }) => {
    // Sign in as test user
    await signInAsTestUser(page, TEST_USER);

    // Visit home page
    await page.goto('/');

    // Click sign out
    const signOutButton = page.locator('button', { hasText: /sign out/i });
    await signOutButton.click();

    // Wait for redirect to sign-in page
    await page.waitForURL(/\/auth\/signin/);
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should protect API routes from unauthenticated access', async ({ page }) => {
    // Try to access API without authentication
    const response = await page.request.get('http://localhost:3001/api/tasks');

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });
});
