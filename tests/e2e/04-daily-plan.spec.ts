import { test, expect } from '@playwright/test';
import { cleanupUserData, signInAsTestUser, waitForApiCall } from './helpers';

const TEST_USER = 'test-daily@example.com';

test.describe('Daily Plan & Ivy Lee Method', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupUserData(TEST_USER);
    await signInAsTestUser(page, TEST_USER);
  });

  test.afterEach(async () => {
    await cleanupUserData(TEST_USER);
  });

  test('should show empty state on home page with no tasks', async ({ page }) => {
    await page.goto('/');

    // Should show empty state
    await expect(page.locator('text=No tasks for today yet')).toBeVisible();
  });

  test('should navigate to morning check-in', async ({ page }) => {
    await page.goto('/');

    // Should show morning check-in prompt
    await expect(page.locator('text=Morning Check-in')).toBeVisible();

    // Click the check-in link
    await page.click('a:has-text("Morning Check-in")');

    await expect(page).toHaveURL('/checkin');
  });

  test('should generate daily plan with top 6 tasks', async ({ page }) => {
    // First, create 10 tasks
    await page.goto('/tasks');

    for (let i = 1; i <= 10; i++) {
      const quickAdd = page.locator('input[placeholder*="Quick add" i]');
      await quickAdd.fill(`Task ${i}`);

      const responsePromise = waitForApiCall(page, '/api/tasks');
      await quickAdd.press('Enter');
      await responsePromise;
    }

    // Go to morning check-in
    await page.goto('/checkin');

    // Click Generate Plan button
    const responsePromise = waitForApiCall(page, '/api/daily-plan');
    await page.click('button:has-text("Generate")');
    await responsePromise;

    // Should show 6 tasks (Ivy Lee method limit)
    const taskCards = page.locator('[class*="TaskCard"]');
    await expect(taskCards).toHaveCount(6);

    // Each task should have a position number
    for (let i = 1; i <= 6; i++) {
      await expect(page.locator(`text=${i}`).first()).toBeVisible();
    }
  });

  test('should complete morning check-in', async ({ page }) => {
    // Create some tasks first
    await page.goto('/tasks');
    const quickAdd = page.locator('input[placeholder*="Quick add" i]');
    await quickAdd.fill('Morning task');
    await quickAdd.press('Enter');
    await waitForApiCall(page, '/api/tasks');

    // Go to check-in and generate plan
    await page.goto('/checkin');
    await page.click('button:has-text("Generate")');
    await waitForApiCall(page, '/api/daily-plan');

    // Add morning notes
    const notesTextarea = page.locator('textarea[placeholder*="morning" i]');
    await notesTextarea.fill('Ready to tackle today!');

    // Complete morning check-in
    const responsePromise = waitForApiCall(page, '/api/daily-plan');
    await page.click('button:has-text("Complete Morning Check-in")');
    await responsePromise;

    // Should redirect to home
    await expect(page).toHaveURL('/');

    // Should show end-of-day review prompt instead
    await expect(page.locator('text=End-of-Day Review')).toBeVisible();
  });

  test('should complete tasks from home page', async ({ page }) => {
    // Create task and generate plan
    await page.goto('/tasks');
    const quickAdd = page.locator('input[placeholder*="Quick add" i]');
    await quickAdd.fill('Task to complete');
    await quickAdd.press('Enter');
    await waitForApiCall(page, '/api/tasks');

    await page.goto('/checkin');
    await page.click('button:has-text("Generate")');
    await waitForApiCall(page, '/api/daily-plan');

    // Go to home
    await page.goto('/');

    // Complete the task
    const checkbox = page.locator('button[title="Mark complete"]').first();
    await checkbox.click();
    await waitForApiCall(page, '/api/tasks');

    // Task should show as completed
    await expect(page.locator('text=Task to complete')).toHaveClass(/opacity-60/);
  });

  test('should regenerate plan with new tasks', async ({ page }) => {
    // Create and generate initial plan
    await page.goto('/tasks');
    let quickAdd = page.locator('input[placeholder*="Quick add" i]');
    await quickAdd.fill('Initial task');
    await quickAdd.press('Enter');
    await waitForApiCall(page, '/api/tasks');

    await page.goto('/checkin');
    await page.click('button:has-text("Generate")');
    await waitForApiCall(page, '/api/daily-plan');

    // Complete morning check-in
    await page.click('button:has-text("Complete Morning Check-in")');
    await waitForApiCall(page, '/api/daily-plan');

    // Add a new task
    await page.goto('/tasks');
    quickAdd = page.locator('input[placeholder*="Quick add" i]');
    await quickAdd.fill('New urgent task');
    await quickAdd.press('Enter');
    await waitForApiCall(page, '/api/tasks');

    // Go to check-in and regenerate
    await page.goto('/checkin');
    await page.click('button:has-text("Regenerate")');
    await waitForApiCall(page, '/api/daily-plan');

    // Should see the new task in the plan
    await expect(page.locator('text=New urgent task')).toBeVisible();
  });

  test('should complete evening check-in', async ({ page }) => {
    // Create task and complete morning check-in
    await page.goto('/tasks');
    const quickAdd = page.locator('input[placeholder*="Quick add" i]');
    await quickAdd.fill('Daily task');
    await quickAdd.press('Enter');
    await waitForApiCall(page, '/api/tasks');

    await page.goto('/checkin');
    await page.click('button:has-text("Generate")');
    await waitForApiCall(page, '/api/daily-plan');
    await page.click('button:has-text("Complete Morning Check-in")');
    await waitForApiCall(page, '/api/daily-plan');

    // Go back to check-in for evening
    await page.goto('/checkin');

    // Add evening notes
    const eveningNotes = page.locator('textarea[placeholder*="evening" i]');
    await eveningNotes.fill('Good progress today!');

    // Complete evening check-in
    const responsePromise = waitForApiCall(page, '/api/daily-plan');
    await page.click('button:has-text("Complete Evening Check-in")');
    await responsePromise;

    // Should redirect to home
    await expect(page).toHaveURL('/');

    // Should show completion message
    await expect(page.locator('text=All check-ins complete')).toBeVisible();
  });

  test('should show progress bar on home page', async ({ page }) => {
    // Create 3 tasks
    await page.goto('/tasks');
    for (let i = 1; i <= 3; i++) {
      const quickAdd = page.locator('input[placeholder*="Quick add" i]');
      await quickAdd.fill(`Task ${i}`);
      await quickAdd.press('Enter');
      await waitForApiCall(page, '/api/tasks');
    }

    // Generate plan
    await page.goto('/checkin');
    await page.click('button:has-text("Generate")');
    await waitForApiCall(page, '/api/daily-plan');

    // Go to home
    await page.goto('/');

    // Should show 0/3 completed
    await expect(page.locator('text=0/3 tasks')).toBeVisible();

    // Complete one task
    const checkbox = page.locator('button[title="Mark complete"]').first();
    await checkbox.click();
    await waitForApiCall(page, '/api/tasks');

    // Should show 1/3 completed
    await expect(page.locator('text=1/3 tasks')).toBeVisible();
  });
});
