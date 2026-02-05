import { test, expect } from '@playwright/test';
import { cleanupUserData, signInAsTestUser, waitForApiCall } from './helpers';

const USER_A = 'user-a@example.com';
const USER_B = 'user-b@example.com';

test.describe('Multi-User Data Isolation', () => {
  test.beforeEach(async () => {
    await cleanupUserData(USER_A);
    await cleanupUserData(USER_B);
  });

  test.afterEach(async () => {
    await cleanupUserData(USER_A);
    await cleanupUserData(USER_B);
  });

  test('should isolate clients between users', async ({ page, context }) => {
    // Sign in as User A and create a client
    await signInAsTestUser(page, USER_A);
    await page.goto('/clients');

    await page.click('button:has-text("New Client")');
    await page.fill('input[name="name"]', 'User A Client');
    await page.selectOption('select', { label: '1 - VIP' });

    let responsePromise = waitForApiCall(page, '/api/clients');
    await page.click('button[type="submit"]:has-text("Create")');
    await responsePromise;

    // Verify User A sees their client
    await expect(page.locator('text=User A Client')).toBeVisible();

    // Clear cookies and sign in as User B
    await context.clearCookies();
    await signInAsTestUser(page, USER_B);
    await page.goto('/clients');

    // Create a different client as User B
    await page.click('button:has-text("New Client")');
    await page.fill('input[name="name"]', 'User B Client');
    await page.selectOption('select', { label: '2 - High' });

    responsePromise = waitForApiCall(page, '/api/clients');
    await page.click('button[type="submit"]:has-text("Create")');
    await responsePromise;

    // User B should NOT see User A's client
    await expect(page.locator('text=User B Client')).toBeVisible();
    await expect(page.locator('text=User A Client')).not.toBeVisible();

    // Switch back to User A
    await context.clearCookies();
    await signInAsTestUser(page, USER_A);
    await page.goto('/clients');

    // User A should NOT see User B's client
    await expect(page.locator('text=User A Client')).toBeVisible();
    await expect(page.locator('text=User B Client')).not.toBeVisible();
  });

  test('should isolate tasks between users', async ({ page, context }) => {
    // Sign in as User A and create a task
    await signInAsTestUser(page, USER_A);
    await page.goto('/tasks');

    const quickAdd = page.locator('input[placeholder*="Quick add" i]');
    await quickAdd.fill('User A Task');

    let responsePromise = waitForApiCall(page, '/api/tasks');
    await quickAdd.press('Enter');
    await responsePromise;

    // Verify User A sees their task
    await expect(page.locator('text=User A Task')).toBeVisible();

    // Sign in as User B and create a different task
    await context.clearCookies();
    await signInAsTestUser(page, USER_B);
    await page.goto('/tasks');

    const quickAddB = page.locator('input[placeholder*="Quick add" i]');
    await quickAddB.fill('User B Task');

    responsePromise = waitForApiCall(page, '/api/tasks');
    await quickAddB.press('Enter');
    await responsePromise;

    // User B should NOT see User A's task
    await expect(page.locator('text=User B Task')).toBeVisible();
    await expect(page.locator('text=User A Task')).not.toBeVisible();

    // Switch back to User A
    await context.clearCookies();
    await signInAsTestUser(page, USER_A);
    await page.goto('/tasks');

    // User A should NOT see User B's task
    await expect(page.locator('text=User A Task')).toBeVisible();
    await expect(page.locator('text=User B Task')).not.toBeVisible();
  });

  test('should isolate daily plans between users', async ({ page, context }) => {
    // User A creates task and generates plan
    await signInAsTestUser(page, USER_A);
    await page.goto('/tasks');

    const quickAddA = page.locator('input[placeholder*="Quick add" i]');
    await quickAddA.fill('User A Daily Task');
    await quickAddA.press('Enter');
    await waitForApiCall(page, '/api/tasks');

    await page.goto('/checkin');
    await page.click('button:has-text("Generate")');
    await waitForApiCall(page, '/api/daily-plan');

    // Verify User A's plan exists
    await expect(page.locator('text=User A Daily Task')).toBeVisible();

    // User B creates task and generates plan
    await context.clearCookies();
    await signInAsTestUser(page, USER_B);
    await page.goto('/tasks');

    const quickAddB = page.locator('input[placeholder*="Quick add" i]');
    await quickAddB.fill('User B Daily Task');
    await quickAddB.press('Enter');
    await waitForApiCall(page, '/api/tasks');

    await page.goto('/checkin');
    await page.click('button:has-text("Generate")');
    await waitForApiCall(page, '/api/daily-plan');

    // User B should only see their own task in the plan
    await expect(page.locator('text=User B Daily Task')).toBeVisible();
    await expect(page.locator('text=User A Daily Task')).not.toBeVisible();

    // Check home page for User B
    await page.goto('/');
    await expect(page.locator('text=User B Daily Task')).toBeVisible();
    await expect(page.locator('text=User A Daily Task')).not.toBeVisible();
  });

  test('should prevent API access to other users data via direct ID', async ({ page, context }) => {
    // User A creates a client
    await signInAsTestUser(page, USER_A);
    await page.goto('/clients');

    await page.click('button:has-text("New Client")');
    await page.fill('input[name="name"]', 'Private Client');
    await page.selectOption('select', { label: '1 - VIP' });

    const createResponse = page.waitForResponse(response =>
      response.url().includes('/api/clients') && response.request().method() === 'POST'
    );
    await page.click('button[type="submit"]:has-text("Create")');
    const response = await createResponse;
    const clientData = await response.json();
    const clientId = clientData.id;

    // Sign in as User B
    await context.clearCookies();
    await signInAsTestUser(page, USER_B);

    // Try to access User A's client via API
    const apiResponse = await page.request.get(`http://localhost:3001/api/clients/${clientId}`);

    // Should return 404 (not found) not 200, indicating proper isolation
    expect(apiResponse.status()).toBe(404);
  });

  test('should prevent editing other users tasks', async ({ page, context }) => {
    // User A creates a task
    await signInAsTestUser(page, USER_A);
    await page.goto('/tasks');

    const quickAdd = page.locator('input[placeholder*="Quick add" i]');
    await quickAdd.fill('Protected Task');

    const createResponse = page.waitForResponse(response =>
      response.url().includes('/api/tasks') && response.request().method() === 'POST'
    );
    await quickAdd.press('Enter');
    const response = await createResponse;
    const taskData = await response.json();
    const taskId = taskData.id;

    // Sign in as User B
    await context.clearCookies();
    await signInAsTestUser(page, USER_B);

    // Try to edit User A's task via API
    const updateResponse = await page.request.put(`http://localhost:3001/api/tasks/${taskId}`, {
      data: { title: 'Hacked Task' }
    });

    // Should return 404 (not found) indicating proper ownership validation
    expect(updateResponse.status()).toBe(404);

    // Verify User A's task wasn't modified
    await context.clearCookies();
    await signInAsTestUser(page, USER_A);
    await page.goto('/tasks');

    await expect(page.locator('text=Protected Task')).toBeVisible();
    await expect(page.locator('text=Hacked Task')).not.toBeVisible();
  });

  test('should prevent deleting other users clients', async ({ page, context }) => {
    // User A creates a client
    await signInAsTestUser(page, USER_A);
    await page.goto('/clients');

    await page.click('button:has-text("New Client")');
    await page.fill('input[name="name"]', 'Protected Client');
    await page.selectOption('select', { label: '1 - VIP' });

    const createResponse = page.waitForResponse(response =>
      response.url().includes('/api/clients') && response.request().method() === 'POST'
    );
    await page.click('button[type="submit"]:has-text("Create")');
    const response = await createResponse;
    const clientData = await response.json();
    const clientId = clientData.id;

    // Sign in as User B
    await context.clearCookies();
    await signInAsTestUser(page, USER_B);

    // Try to delete User A's client via API
    const deleteResponse = await page.request.delete(`http://localhost:3001/api/clients/${clientId}`);

    // Should return 404 (not found) indicating proper ownership validation
    expect(deleteResponse.status()).toBe(404);

    // Verify User A's client still exists
    await context.clearCookies();
    await signInAsTestUser(page, USER_A);
    await page.goto('/clients');

    await expect(page.locator('text=Protected Client')).toBeVisible();
  });
});
