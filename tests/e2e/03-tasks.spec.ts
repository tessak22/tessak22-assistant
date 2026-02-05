import { test, expect } from '@playwright/test';
import { cleanupUserData, signInAsTestUser, waitForApiCall } from './helpers';

const TEST_USER = 'test-tasks@example.com';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupUserData(TEST_USER);
    await signInAsTestUser(page, TEST_USER);
  });

  test.afterEach(async () => {
    await cleanupUserData(TEST_USER);
  });

  test('should navigate to tasks page', async ({ page }) => {
    await page.goto('/');

    // Click on Tasks link in navigation
    await page.click('a[href="/tasks"]');

    await expect(page).toHaveURL('/tasks');
    await expect(page.locator('h1')).toContainText('Tasks');
  });

  test('should create a new task using full form', async ({ page }) => {
    await page.goto('/tasks');

    // Click New Task button
    await page.click('button:has-text("New Task")');

    // Fill in task form
    await page.fill('input[placeholder*="task title" i]', 'Complete project documentation');
    await page.fill('textarea', 'Write comprehensive docs for the project');
    await page.selectOption('select:has(option:has-text("Critical"))', '1');
    await page.fill('input[type="number"]', '45');

    // Submit form
    const responsePromise = waitForApiCall(page, '/api/tasks');
    await page.click('button[type="submit"]:has-text("Create")');
    await responsePromise;

    // Verify task appears in list
    await expect(page.locator('text=Complete project documentation')).toBeVisible();
  });

  test('should create a task using quick add', async ({ page }) => {
    await page.goto('/tasks');

    // Find quick add input
    const quickAddInput = page.locator('input[placeholder*="Quick add" i]');
    await quickAddInput.fill('Review pull requests');

    // Submit
    const responsePromise = waitForApiCall(page, '/api/tasks');
    await quickAddInput.press('Enter');
    await responsePromise;

    // Verify task appears
    await expect(page.locator('text=Review pull requests')).toBeVisible();
  });

  test('should edit an existing task', async ({ page }) => {
    await page.goto('/tasks');

    // Create a task first
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder*="task title" i]', 'Original Task');

    let responsePromise = waitForApiCall(page, '/api/tasks');
    await page.click('button[type="submit"]:has-text("Create")');
    await responsePromise;

    // Click Edit button on the task
    await page.click('button:has-text("Edit")');

    // Change title
    await page.fill('input[placeholder*="task title" i]', 'Updated Task Title');

    // Submit
    responsePromise = waitForApiCall(page, '/api/tasks');
    await page.click('button[type="submit"]:has-text("Update")');
    await responsePromise;

    // Verify updated title appears
    await expect(page.locator('text=Updated Task Title')).toBeVisible();
  });

  test('should change task status', async ({ page }) => {
    await page.goto('/tasks');

    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder*="task title" i]', 'Task to Start');

    let responsePromise = waitForApiCall(page, '/api/tasks');
    await page.click('button[type="submit"]:has-text("Create")');
    await responsePromise;

    // Click Start button
    responsePromise = waitForApiCall(page, '/api/tasks');
    await page.click('button:has-text("Start")');
    await responsePromise;

    // Switch to in_progress filter
    await page.click('button:has-text("In Progress")');

    // Task should appear in in_progress list
    await expect(page.locator('text=Task to Start')).toBeVisible();
  });

  test('should delete a task', async ({ page }) => {
    await page.goto('/tasks');

    // Create a task
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder*="task title" i]', 'Task to Delete');

    let responsePromise = waitForApiCall(page, '/api/tasks');
    await page.click('button[type="submit"]:has-text("Create")');
    await responsePromise;

    // Verify task exists
    await expect(page.locator('text=Task to Delete')).toBeVisible();

    // Set up dialog handler for confirmation
    page.on('dialog', dialog => dialog.accept());

    // Click Delete button
    responsePromise = waitForApiCall(page, '/api/tasks');
    await page.click('button:has-text("Delete")');
    await responsePromise;

    // Verify task is gone
    await expect(page.locator('text=Task to Delete')).not.toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('/tasks');

    // Create tasks with different statuses
    const statuses = ['Pending Task', 'Started Task', 'Completed Task'];

    for (const taskName of statuses) {
      await page.click('button:has-text("New Task")');
      await page.fill('input[placeholder*="task title" i]', taskName);

      const responsePromise = waitForApiCall(page, '/api/tasks');
      await page.click('button[type="submit"]:has-text("Create")');
      await responsePromise;
    }

    // Start the second task
    await page.locator('text=Started Task').locator('..').locator('button:has-text("Start")').click();
    await waitForApiCall(page, '/api/tasks');

    // Complete the third task
    await page.locator('text=Completed Task').locator('..').locator('button:has-text("Start")').click();
    await waitForApiCall(page, '/api/tasks');

    const checkbox = page.locator('text=Completed Task').locator('..').locator('button[title="Mark complete"]');
    await checkbox.click();
    await waitForApiCall(page, '/api/tasks');

    // Filter by pending
    await page.click('button:has-text("Pending")');
    await expect(page.locator('text=Pending Task')).toBeVisible();
    await expect(page.locator('text=Started Task')).not.toBeVisible();

    // Filter by in progress
    await page.click('button:has-text("In Progress")');
    await expect(page.locator('text=Started Task')).toBeVisible();
    await expect(page.locator('text=Pending Task')).not.toBeVisible();

    // Filter by completed
    await page.click('button:has-text("Completed")');
    await expect(page.locator('text=Completed Task')).toBeVisible();
    await expect(page.locator('text=Pending Task')).not.toBeVisible();
  });

  test('should respect 60 minute limit for tasks', async ({ page }) => {
    await page.goto('/tasks');

    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder*="task title" i]', 'Long Task');

    // Try to set estimate to more than 60
    const estimateInput = page.locator('input[type="number"]');
    await estimateInput.fill('90');

    // Should be capped at 60 (Ivy Lee method)
    await expect(estimateInput).toHaveValue('60');
  });
});
