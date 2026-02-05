import { test, expect } from '@playwright/test';
import { cleanupUserData, signInAsTestUser, waitForApiCall } from './helpers';

const TEST_USER = 'test-clients@example.com';

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupUserData(TEST_USER);
    await signInAsTestUser(page, TEST_USER);
  });

  test.afterEach(async () => {
    await cleanupUserData(TEST_USER);
  });

  test('should navigate to clients page', async ({ page }) => {
    await page.goto('/');

    // Click on Clients link in navigation
    await page.click('a[href="/clients"]');

    await expect(page).toHaveURL('/clients');
    await expect(page.locator('h1')).toContainText('Clients');
  });

  test('should create a new client', async ({ page }) => {
    await page.goto('/clients');

    // Click New Client button
    await page.click('button:has-text("New Client")');

    // Fill in client form
    await page.fill('input[name="name"]', 'ACME Corporation');
    await page.selectOption('select:has(option:has-text("VIP"))', { label: '1 - VIP' });

    // Set color
    const colorInput = page.locator('input[type="color"]');
    await colorInput.fill('#ff0000');

    // Submit form
    const responsePromise = waitForApiCall(page, '/api/clients');
    await page.click('button[type="submit"]:has-text("Create")');
    await responsePromise;

    // Verify client appears in list
    await expect(page.locator('text=ACME Corporation')).toBeVisible();
  });

  test('should edit an existing client', async ({ page }) => {
    await page.goto('/clients');

    // Create a client first
    await page.click('button:has-text("New Client")');
    await page.fill('input[name="name"]', 'Test Client');
    await page.selectOption('select', { label: '3 - Medium' });

    let responsePromise = waitForApiCall(page, '/api/clients');
    await page.click('button[type="submit"]:has-text("Create")');
    await responsePromise;

    // Click Edit button
    await page.click('button:has-text("Edit")');

    // Change name
    await page.fill('input[name="name"]', 'Updated Client Name');

    // Submit
    responsePromise = waitForApiCall(page, '/api/clients');
    await page.click('button[type="submit"]:has-text("Update")');
    await responsePromise;

    // Verify updated name appears
    await expect(page.locator('text=Updated Client Name')).toBeVisible();
  });

  test('should delete a client', async ({ page }) => {
    await page.goto('/clients');

    // Create a client first
    await page.click('button:has-text("New Client")');
    await page.fill('input[name="name"]', 'Client to Delete');
    await page.selectOption('select', { label: '5 - Lowest' });

    let responsePromise = waitForApiCall(page, '/api/clients');
    await page.click('button[type="submit"]:has-text("Create")');
    await responsePromise;

    // Verify client exists
    await expect(page.locator('text=Client to Delete')).toBeVisible();

    // Set up dialog handler for confirmation
    page.on('dialog', dialog => dialog.accept());

    // Click Delete button
    responsePromise = waitForApiCall(page, '/api/clients');
    await page.click('button:has-text("Delete")');
    await responsePromise;

    // Verify client is gone
    await expect(page.locator('text=Client to Delete')).not.toBeVisible();
  });

  test('should display client priority correctly', async ({ page }) => {
    await page.goto('/clients');

    // Create clients with different priorities
    const priorities = [
      { value: '1', label: '1 - VIP', name: 'VIP Client' },
      { value: '3', label: '3 - Medium', name: 'Medium Client' },
      { value: '5', label: '5 - Lowest', name: 'Low Priority Client' },
    ];

    for (const priority of priorities) {
      await page.click('button:has-text("New Client")');
      await page.fill('input[name="name"]', priority.name);
      await page.selectOption('select', { label: priority.label });

      const responsePromise = waitForApiCall(page, '/api/clients');
      await page.click('button[type="submit"]:has-text("Create")');
      await responsePromise;

      // Verify priority is displayed
      const clientCard = page.locator(`text=${priority.name}`).locator('..');
      await expect(clientCard).toContainText(`P${priority.value}`);
    }
  });

  test('should show empty state when no clients exist', async ({ page }) => {
    await page.goto('/clients');

    // Should show empty state message
    await expect(page.locator('text=No clients yet')).toBeVisible();
  });
});
